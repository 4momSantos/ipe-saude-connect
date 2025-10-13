import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkflowNode {
  id: string;
  type: string;
  data: {
    type: string;
    label: string;
    [key: string]: any;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

// Função auxiliar para lock simplificado
async function acquireStepLock(supabase: any, stepExecutionId: string) {
  const { data, error } = await supabase
    .from('workflow_step_executions')
    .update({ 
      status: 'processing',
    })
    .eq('id', stepExecutionId)
    .in('status', ['paused', 'pending'])
    .select()
    .maybeSingle();
  
  if (error || !data) {
    return { success: false, message: 'Step já está sendo processado ou não existe' };
  }
  
  return { success: true, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[CONTINUE-WORKFLOW] Using service role key`);

    const { stepExecutionId, decision } = await req.json();
    
    // ADQUIRIR LOCK
    console.log(`[CONTINUE-WORKFLOW] Tentando lock em step ${stepExecutionId}`);
    const lock = await acquireStepLock(supabaseClient, stepExecutionId);
    if (!lock.success) {
      console.warn(`[CONTINUE-WORKFLOW] ⚠️ ${lock.message}`);
      return new Response(
        JSON.stringify({ error: lock.message }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`[CONTINUE-WORKFLOW] ✅ Lock adquirido`);

    console.log(`[CONTINUE-WORKFLOW] Continuando workflow após decisão: ${decision} para step ${stepExecutionId}`);

    // Buscar step execution
    const { data: stepExecution, error: stepError } = await supabaseClient
      .from("workflow_step_executions")
      .select(`
        *,
        workflow_executions (
          id,
          workflow_id,
          workflows (
            nodes,
            edges
          )
        )
      `)
      .eq("id", stepExecutionId)
      .single();

    if (stepError) throw stepError;

    const execution = stepExecution.workflow_executions;
    const nodes = execution.workflows.nodes as WorkflowNode[];
    const edges = execution.workflows.edges as WorkflowEdge[];

    // Encontrar próximo nó
    const nextEdge = edges.find((e) => e.source === stepExecution.node_id);
    
    if (!nextEdge) {
      console.log(`[CONTINUE-WORKFLOW] Nenhum próximo nó encontrado. Finalizando workflow.`);
      
      // Finalizar workflow
      await supabaseClient
        .from("workflow_executions")
        .update({
          status: decision === 'approved' ? "completed" : "failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", execution.id);

      return new Response(
        JSON.stringify({ message: "Workflow finalizado" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const nextNode = nodes.find((n) => n.id === nextEdge.target);
    if (!nextNode) {
      throw new Error("Próximo nó não encontrado");
    }

    console.log(`[CONTINUE-WORKFLOW] Próximo nó: ${nextNode.id} (${nextNode.data.type})`);

    // Atualizar current_node_id
    await supabaseClient
      .from("workflow_executions")
      .update({ current_node_id: nextNode.id })
      .eq("id", execution.id);

    // Executar próximo nó (simplificado - apenas criar step execution)
    const { data: newStepExecution, error: newStepError } = await supabaseClient
      .from("workflow_step_executions")
      .insert({
        execution_id: execution.id,
        node_id: nextNode.id,
        node_type: nextNode.data.type,
        status: nextNode.data.type === "end" ? "completed" : "running",
        started_at: new Date().toISOString(),
        completed_at: nextNode.data.type === "end" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (newStepError) throw newStepError;

    // Se for nó final, completar workflow
    if (nextNode.data.type === "end") {
      console.log(`[CONTINUE-WORKFLOW] Nó final alcançado. Finalizando workflow ${execution.id}`);
      
      await supabaseClient
        .from("workflow_executions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", execution.id);
    } else {
      // Se NÃO for nó final, continuar executando recursivamente
      console.log(`[CONTINUE-WORKFLOW] Invocando execute-workflow recursivamente para nó ${nextNode.id}...`);
      
      const { data: inscricaoData } = await supabaseClient
        .from("inscricoes_edital")
        .select("id")
        .eq("workflow_execution_id", execution.id)
        .maybeSingle();
      
      const { error: invokeError } = await supabaseClient.functions.invoke(
        'execute-workflow', 
        {
          body: {
            workflowId: execution.workflow_id,
            inputData: stepExecution.output_data || {},
            inscricaoId: inscricaoData?.id,
            continueFrom: nextNode.id
          }
        }
      );
      
      if (invokeError) {
        console.error(`[CONTINUE-WORKFLOW] ❌ Erro ao invocar execute-workflow:`, invokeError);
      } else {
        console.log(`[CONTINUE-WORKFLOW] ✅ Execute-workflow invocada com sucesso`);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Workflow continuado com sucesso",
        nextNode: nextNode.data.type,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[CONTINUE-WORKFLOW] Erro:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
