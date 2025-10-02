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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error("Não autorizado");
    }

    const { workflowId, inputData } = await req.json();

    // Buscar workflow
    const { data: workflow, error: workflowError } = await supabaseClient
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (workflowError) throw workflowError;
    if (!workflow.is_active) throw new Error("Workflow está inativo");

    // Criar registro de execução
    const { data: execution, error: executionError } = await supabaseClient
      .from("workflow_executions")
      .insert({
        workflow_id: workflowId,
        started_by: user.id,
        status: "running",
      })
      .select()
      .single();

    if (executionError) throw executionError;

    console.log("Execução iniciada:", execution.id);

    // Encontrar nó inicial (start)
    const nodes = workflow.nodes as WorkflowNode[];
    const edges = workflow.edges as WorkflowEdge[];
    const startNode = nodes.find((n) => n.data.type === "start");

    if (!startNode) {
      throw new Error("Nó inicial não encontrado");
    }

    // Executar workflow em background
    executeWorkflowSteps(
      supabaseClient,
      execution.id,
      nodes,
      edges,
      startNode,
      inputData
    ).catch((error) => {
      console.error("Erro na execução do workflow:", error);
      supabaseClient
        .from("workflow_executions")
        .update({
          status: "failed",
          error_message: error.message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", execution.id)
        .then(() => console.log("Execução marcada como falhada"));
    });

    return new Response(
      JSON.stringify({
        executionId: execution.id,
        status: "started",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erro ao iniciar execução:", error);
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

async function executeWorkflowSteps(
  supabaseClient: any,
  executionId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  currentNode: WorkflowNode,
  context: any
) {
  console.log(`Executando nó: ${currentNode.id} (${currentNode.data.type})`);

  // Criar registro de step execution
  const { data: stepExecution, error: stepError } = await supabaseClient
    .from("workflow_step_executions")
    .insert({
      execution_id: executionId,
      node_id: currentNode.id,
      node_type: currentNode.data.type,
      status: "running",
      input_data: context,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (stepError) throw stepError;

  try {
    let outputData = context;

    // Executar lógica baseada no tipo de nó
    switch (currentNode.data.type) {
      case "start":
        console.log("Nó inicial - passando para próximo");
        break;

      case "form":
        console.log("Aguardando preenchimento de formulário");
        // Formulários precisam ser preenchidos manualmente
        // A execução para aqui até que o formulário seja submetido
        await supabaseClient
          .from("workflow_step_executions")
          .update({
            status: "pending",
            completed_at: new Date().toISOString(),
          })
          .eq("id", stepExecution.id);
        return; // Para a execução aqui

      case "email":
        console.log("Enviando email (simulado)");
        outputData = { ...context, emailSent: true };
        break;

      case "webhook":
        console.log("Chamando webhook (simulado)");
        outputData = { ...context, webhookCalled: true };
        break;

      case "http":
        console.log("Fazendo chamada HTTP (simulado)");
        if (currentNode.data.httpConfig) {
          const config = currentNode.data.httpConfig;
          console.log(`HTTP ${config.method} para ${config.url}`);
        }
        outputData = { ...context, httpCalled: true };
        break;

      case "database":
        console.log("Operação de banco de dados (simulado)");
        outputData = { ...context, dbOperation: true };
        break;

      case "approval":
        console.log("Aguardando aprovação");
        await supabaseClient
          .from("workflow_step_executions")
          .update({
            status: "pending",
            completed_at: new Date().toISOString(),
          })
          .eq("id", stepExecution.id);
        return; // Para a execução aqui

      case "condition":
        console.log("Avaliando condição");
        // Aqui implementaríamos a lógica de bifurcação
        break;

      case "end":
        console.log("Finalizando workflow");
        await supabaseClient
          .from("workflow_executions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", executionId);
        break;

      default:
        console.log(`Tipo de nó desconhecido: ${currentNode.data.type}`);
    }

    // Marcar step como completo
    await supabaseClient
      .from("workflow_step_executions")
      .update({
        status: "completed",
        output_data: outputData,
        completed_at: new Date().toISOString(),
      })
      .eq("id", stepExecution.id);

    // Se não é um nó final, continuar para o próximo
    if (currentNode.data.type !== "end") {
      const nextEdge = edges.find((e) => e.source === currentNode.id);
      if (nextEdge) {
        const nextNode = nodes.find((n) => n.id === nextEdge.target);
        if (nextNode) {
          await executeWorkflowSteps(
            supabaseClient,
            executionId,
            nodes,
            edges,
            nextNode,
            outputData
          );
        }
      } else {
        console.log("Nenhum próximo nó encontrado");
        await supabaseClient
          .from("workflow_executions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", executionId);
      }
    }
  } catch (error) {
    console.error(`Erro ao executar nó ${currentNode.id}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    await supabaseClient
      .from("workflow_step_executions")
      .update({
        status: "failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", stepExecution.id);
    throw error;
  }
}