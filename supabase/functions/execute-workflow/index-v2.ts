/**
 * Execute Workflow v2 - Com Orquestrador Cognitivo
 * 
 * Nova versão usando WorkflowOrchestrator para execução paralela,
 * condicional e com gestão avançada de estado.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { WorkflowOrchestrator } from './orchestrator/workflow-orchestrator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExecuteWorkflowRequest {
  workflowId: string;
  inputData?: Record<string, any>;
  inscricaoId?: string;
  continueFrom?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { workflowId, inputData = {}, inscricaoId, continueFrom } = await req.json() as ExecuteWorkflowRequest;

    console.log('[EXECUTE_WORKFLOW_V2] 🚀 Iniciando workflow', workflowId);

    // Buscar definição do workflow
    const { data: workflow, error: workflowError } = await supabaseClient
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      throw new Error(`Workflow não encontrado: ${workflowError?.message}`);
    }

    const nodes = workflow.nodes || [];
    const edges = workflow.edges || [];

    console.log(`[EXECUTE_WORKFLOW_V2] Workflow: ${workflow.name} (${nodes.length} nós, ${edges.length} arestas)`);

    // Sprint 5: Buscar edital e validar formulários vinculados (se inscricaoId fornecido)
    if (inscricaoId) {
      const { data: inscricao } = await supabaseClient
        .from('inscricoes_edital')
        .select('edital_id')
        .eq('id', inscricaoId)
        .single();

      if (inscricao?.edital_id) {
        const { data: edital } = await supabaseClient
          .from('editais')
          .select('formularios_vinculados, anexos_processo_esperados, workflow_id, workflow_version')
          .eq('id', inscricao.edital_id)
          .single();

        if (edital) {
          if (!edital.formularios_vinculados || edital.formularios_vinculados.length === 0) {
            console.warn('[EXECUTE_WORKFLOW_V2] ⚠️ Edital sem formulários vinculados');
          } else {
            console.log(`[EXECUTE_WORKFLOW_V2] ✅ Edital com ${edital.formularios_vinculados.length} formulário(s) vinculado(s)`);
            inputData.formulariosDisponiveis = edital.formularios_vinculados;
          }
          
          // Adicionar anexos de processo esperados
          if (edital.anexos_processo_esperados && edital.anexos_processo_esperados.length > 0) {
            console.log(`[EXECUTE_WORKFLOW_V2] ✅ ${edital.anexos_processo_esperados.length} anexo(s) de processo identificado(s)`);
            inputData.anexosProcessoEsperados = edital.anexos_processo_esperados;
          }
        }
      }
    }

    // Criar execução no banco
    const { data: execution, error: executionError } = await supabaseClient
      .from('workflow_executions')
      .insert({
        workflow_id: workflowId,
        workflow_version: workflow.version || 1,
        status: 'running',
        input_data: inputData,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (executionError || !execution) {
      throw new Error(`Erro ao criar execução: ${executionError?.message}`);
    }

    const executionId = execution.id;
    console.log(`[EXECUTE_WORKFLOW_V2] Execução criada: ${executionId}`);

    // Vincular inscrição se fornecida
    if (inscricaoId) {
      await supabaseClient
        .from('inscricoes_edital')
        .update({
          workflow_execution_id: executionId,
          status: 'em_analise'
        })
        .eq('id', inscricaoId);
      
      console.log(`[EXECUTE_WORKFLOW_V2] Inscrição ${inscricaoId} vinculada à execução`);
    }

    // Inicializar Orquestrador Cognitivo
    const orchestrator = new WorkflowOrchestrator(supabaseClient, {
      maxParallelNodes: 3,
      enableConditionals: true,
      enableJoinStrategies: true,
      debug: true
    });

    await orchestrator.initialize(nodes, edges, inputData);
    console.log('[EXECUTE_WORKFLOW_V2] 🧠 Orquestrador inicializado');

    // Executar workflow em background (sem bloquear resposta HTTP)
    Promise.resolve().then(async () => {
      try {
        await orchestrator.execute(executionId);
        
        const finalContext = orchestrator.getContext();
        const progress = orchestrator.getProgress();
        
        console.log(`[EXECUTE_WORKFLOW_V2] ✅ Workflow concluído: ${progress}% completo`);
        
        // Atualizar status final
        await supabaseClient
          .from('workflow_executions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            output_data: finalContext.global
          })
          .eq('id', executionId);

      } catch (err: any) {
        console.error('[EXECUTE_WORKFLOW_V2] ❌ Erro na execução:', err);
        
        await supabaseClient
          .from('workflow_executions')
          .update({
            status: 'failed',
            error_message: err.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', executionId);
      }
    });

    return new Response(
      JSON.stringify({
        executionId,
        status: 'started',
        message: 'Workflow iniciado com orquestrador cognitivo'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('[EXECUTE_WORKFLOW_V2] ❌ Erro fatal:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
