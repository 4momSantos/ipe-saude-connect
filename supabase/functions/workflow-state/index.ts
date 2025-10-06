/**
 * Workflow State Dashboard API
 * Fase 4: API para consulta em tempo real do estado do workflow
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowStateRequest {
  executionId: string;
  includeTransitions?: boolean;
  includeContext?: boolean;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { executionId, includeTransitions, includeContext }: WorkflowStateRequest = 
      await req.json();

    if (!executionId) {
      throw new Error('executionId é obrigatório');
    }

    console.log('[WORKFLOW_STATE] Consultando estado:', executionId);

    // 1. Buscar workflow execution
    const { data: execution, error: execError } = await supabaseClient
      .from('workflow_executions')
      .select('*')
      .eq('id', executionId)
      .single();

    if (execError || !execution) {
      throw new Error(`Execution não encontrada: ${execError?.message}`);
    }

    // 2. Buscar step executions com output_data expandido
    const { data: steps, error: stepsError } = await supabaseClient
      .from('workflow_step_executions')
      .select('*')
      .eq('execution_id', executionId)
      .order('created_at', { ascending: true });

    if (stepsError) {
      throw new Error(`Erro ao buscar steps: ${stepsError.message}`);
    }

    // 3. Processar estados dos nós (integrado com StateTracker)
    const nodeStates = steps?.map(step => {
      // Extrair estado do StateTracker salvo em output_data
      const trackerState = step.output_data?.nodeState;
      
      const state: any = {
        nodeId: step.node_id,
        nodeType: step.node_type,
        status: step.status,
        startedAt: step.started_at,
        completedAt: step.completed_at,
        errorMessage: step.error_message,
        // Dados do StateTracker
        progress: trackerState?.progress || 0,
        retryCount: trackerState?.retryCount || 0,
        blockedBy: trackerState?.blockedBy || [],
      };

      // Incluir transições detalhadas do StateTracker
      if (includeTransitions && trackerState?.transitions) {
        state.transitions = trackerState.transitions.map((t: any) => ({
          from: t.from,
          to: t.to,
          timestamp: t.timestamp,
          reason: t.reason,
          metadata: t.metadata
        }));
      }

      // Incluir metadata adicional do StateTracker
      if (trackerState) {
        state.duration = trackerState.completedAt && trackerState.startedAt 
          ? new Date(trackerState.completedAt).getTime() - new Date(trackerState.startedAt).getTime()
          : null;
      }

      return state;
    }) || [];

    // 4. Calcular estatísticas
    const stats = {
      totalNodes: nodeStates.length,
      pending: nodeStates.filter(n => n.status === 'pending').length,
      running: nodeStates.filter(n => n.status === 'running').length,
      paused: nodeStates.filter(n => n.status === 'paused').length,
      completed: nodeStates.filter(n => n.status === 'completed').length,
      failed: nodeStates.filter(n => n.status === 'failed').length,
      progress: nodeStates.length > 0 
        ? Math.round((nodeStates.filter(n => n.status === 'completed').length / nodeStates.length) * 100)
        : 0
    };

    // 5. Montar resposta
    const response: any = {
      executionId,
      workflowId: execution.workflow_id,
      status: execution.status,
      startedAt: execution.started_at,
      completedAt: execution.completed_at,
      currentNode: execution.current_node_id,
      errorMessage: execution.error_message,
      stats,
      nodes: nodeStates
    };

    // Incluir contexto se solicitado
    if (includeContext) {
      // Buscar último step com output_data
      const lastStep = steps?.reverse().find(s => s.output_data);
      if (lastStep?.input_data) {
        response.context = lastStep.input_data;
      }
    }

    console.log('[WORKFLOW_STATE] Estado retornado:', {
      executionId,
      totalNodes: stats.totalNodes,
      progress: stats.progress
    });

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('[WORKFLOW_STATE] Erro:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
