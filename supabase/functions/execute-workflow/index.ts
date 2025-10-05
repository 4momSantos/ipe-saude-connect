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
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
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

    const { workflowId, inputData, inscricaoId } = await req.json();

    // 🔍 Etapa 1: Log detalhado de entrada
    console.log('[WORKFLOW] 🚀 Função chamada:', {
      workflowId,
      inscricaoId,
      hasInputData: !!inputData,
      userId: user.id,
      userEmail: user.email
    });

    // Buscar workflow
    const { data: workflow, error: workflowError } = await supabaseClient
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (workflowError) throw workflowError;
    if (!workflow.is_active) throw new Error("Workflow está inativo");

    // Verificar triggerConfig do nó start
    const nodes = workflow.nodes as WorkflowNode[];
    const startNode = nodes.find((n) => n.data.type === "start");

    if (!startNode) {
      throw new Error("Nó inicial não encontrado");
    }

    // Log da configuração do trigger
    console.log('[WORKFLOW] 🎯 Configuração do gatilho:', {
      hasTriggerConfig: !!startNode.data.triggerConfig,
      triggerType: startNode.data.triggerConfig?.type,
      triggerTable: startNode.data.triggerConfig?.table,
      triggerEvent: startNode.data.triggerConfig?.event
    });

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

    // 🔍 Etapa 1: Log de execução criada com sucesso
    console.log(`[WORKFLOW] ✅ Execução criada: ${execution.id} | Workflow: ${workflow.name} | User: ${user.id}`);

    // Se houver inscricaoId, vincular a execução à inscrição
    if (inscricaoId) {
      console.log(`[WORKFLOW] 📝 Tentando vincular execution ${execution.id} à inscrição ${inscricaoId}...`);
      const { error: updateError } = await supabaseClient
        .from("inscricoes_edital")
        .update({ 
          workflow_execution_id: execution.id,
          status: 'em_analise'
        })
        .eq("id", inscricaoId);

      if (updateError) {
        console.error(`[WORKFLOW] ❌ ERRO CRÍTICO ao vincular execution ${execution.id} à inscrição ${inscricaoId}:`, {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint
        });
        
        // Marcar workflow como failed
        await supabaseClient
          .from("workflow_executions")
          .update({ 
            status: "failed", 
            error_message: `Erro ao vincular inscrição: ${updateError.message}`,
            completed_at: new Date().toISOString()
          })
          .eq("id", execution.id);
        
        throw new Error(`Falha ao vincular execution à inscrição: ${updateError.message}`);
      } else {
        console.log(`[WORKFLOW] ✅ Vinculado com sucesso: execution ${execution.id} → inscrição ${inscricaoId}`);
      }
    }

    // Encontrar nó inicial (start) já foi feito acima
    const edges = workflow.edges as WorkflowEdge[];

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
        console.log("Nó inicial - configuração:", currentNode.data.triggerConfig);
        // Logica de trigger já foi processada no início da execução
        break;

      case "form":
        console.log(`[WORKFLOW] 📝 Nó FORM detectado: ${currentNode.id}`);
        
        // Se dados já estão no inputData, pular automaticamente
        if (context && Object.keys(context).length > 0) {
          console.log(`[WORKFLOW] ✅ Dados já coletados, pulando formulário`);
          
          await supabaseClient
            .from("workflow_step_executions")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              output_data: { 
                skipped: true, 
                reason: "Dados já na inscrição",
                formData: context 
              }
            })
            .eq("id", stepExecution.id);
          
          outputData = { ...context };
          
          // Avançar automaticamente
          const nextEdge = edges.find(e => e.source === currentNode.id);
          if (nextEdge) {
            const nextNode = nodes.find(n => n.id === nextEdge.target);
            if (nextNode) {
              console.log(`[WORKFLOW] ➡️ Avançando para próximo nó: ${nextNode.id}`);
              await executeWorkflowSteps(supabaseClient, executionId, nodes, edges, nextNode, outputData);
            }
          }
          return;
        }
        
        // Se não tem dados, pausar para preenchimento manual
        console.log(`[WORKFLOW] ⏸️ Pausando para preenchimento de formulário`);
        await supabaseClient
          .from("workflow_step_executions")
          .update({
            status: "pending",
            output_data: { formFields: currentNode.data.formFields }
          })
          .eq("id", stepExecution.id);
        return;

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
        
        // Obter configuração de aprovação do nó
        const approvalConfig = currentNode.data.approvalConfig || { assignmentType: "all" };
        
        // Buscar analistas responsáveis
        let assignedAnalysts: string[] = [];
        
        if (approvalConfig.assignmentType === "all") {
          // Buscar todos os analistas
          const { data: allAnalysts } = await supabaseClient
            .from("user_roles")
            .select("user_id")
            .eq("role", "analista");
          
          assignedAnalysts = allAnalysts?.map((a: { user_id: string }) => a.user_id) || [];
          console.log("Aprovação atribuída a todos os analistas:", assignedAnalysts.length);
        } else if (approvalConfig.assignedAnalysts && approvalConfig.assignedAnalysts.length > 0) {
          assignedAnalysts = approvalConfig.assignedAnalysts;
          console.log("Aprovação atribuída a analistas específicos:", assignedAnalysts.length);
        }
        
        // Criar registros de aprovação para cada analista
        if (assignedAnalysts.length > 0) {
          const approvalRecords = assignedAnalysts.map(analystId => ({
            step_execution_id: stepExecution.id,
            approver_id: analystId,
            decision: "pending",
          }));
          
          const { error: approvalError } = await supabaseClient
            .from("workflow_approvals")
            .insert(approvalRecords);
          
          if (approvalError) {
            console.error("Erro ao criar registros de aprovação:", approvalError);
          } else {
            console.log("Registros de aprovação criados:", approvalRecords.length);
            
            // Criar notificações para analistas
            const notifications = assignedAnalysts.map(analystId => ({
              user_id: analystId,
              type: "info",
              title: "⏰ Nova Aprovação Pendente",
              message: `Inscrição aguarda sua análise`,
              related_type: "workflow_approval",
              related_id: stepExecution.id
            }));
            
            const { error: notifError } = await supabaseClient
              .from("app_notifications")
              .insert(notifications);
            
            if (notifError) {
              console.error("[WORKFLOW] ❌ Erro ao criar notificações:", notifError);
            } else {
              console.log(`[WORKFLOW] ✅ ${notifications.length} notificações enviadas`);
            }
          }
        }
        
        await supabaseClient
          .from("workflow_step_executions")
          .update({
            status: "pending",
            output_data: { assignedAnalysts, approvalConfig },
            completed_at: new Date().toISOString(),
          })
          .eq("id", stepExecution.id);
        
        // Workflow fica pendente até aprovação
        console.log(`[WORKFLOW] ⏸️ Execução ${executionId} pausada na aprovação ${currentNode.id}`);
        return; // Para a execução aqui

      case "condition":
        console.log("Avaliando condição");
        // Aqui implementaríamos a lógica de bifurcação
        break;

      case "end":
        console.log(`[WORKFLOW] Finalizando workflow: ${executionId}`);
        
        // Atualizar status do workflow
        await supabaseClient
          .from("workflow_executions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", executionId);

        console.log(`[WORKFLOW] Workflow ${executionId} finalizado com sucesso`);
        // Nota: A sincronização de status para inscricao será feita pelo trigger sync_workflow_status_to_inscricao
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

// Função auxiliar para enviar notificações
async function notifyStakeholders(
  supabaseClient: any,
  inscricaoId: string,
  type: 'aprovado' | 'rejeitado' | 'assinatura_pendente' | 'concluido',
  details?: any
) {
  try {
    console.log(`Enviando notificação tipo: ${type} para inscrição ${inscricaoId}`);

    // Buscar dados da inscrição e candidato
    const { data: inscricao, error: inscError } = await supabaseClient
      .from('inscricoes_edital')
      .select(`
        candidato_id,
        analisado_por,
        editais (titulo)
      `)
      .eq('id', inscricaoId)
      .single();

    if (inscError) {
      console.error('Erro ao buscar inscrição:', inscError);
      return;
    }

    let title = '';
    let message = '';
    let notificationType = 'info';

    switch (type) {
      case 'aprovado':
        title = '✅ Inscrição Aprovada';
        message = `Sua inscrição no edital "${inscricao.editais?.titulo}" foi aprovada! Aguarde a solicitação de assinatura.`;
        notificationType = 'success';
        break;
      case 'rejeitado':
        title = '❌ Inscrição Não Aprovada';
        message = `Sua inscrição no edital "${inscricao.editais?.titulo}" não foi aprovada. ${details?.motivo || 'Você pode corrigir e reenviar.'}`;
        notificationType = 'error';
        break;
      case 'assinatura_pendente':
        title = '✍️ Assinatura Pendente';
        message = `Por favor, assine o contrato de credenciamento para o edital "${inscricao.editais?.titulo}".`;
        notificationType = 'warning';
        break;
      case 'concluido':
        title = '🎉 Credenciamento Concluído';
        message = `Parabéns! Seu credenciamento para o edital "${inscricao.editais?.titulo}" foi concluído com sucesso.`;
        notificationType = 'success';
        break;
    }

    // Criar notificação para o candidato
    const { error: notifError } = await supabaseClient
      .from('app_notifications')
      .insert({
        user_id: inscricao.candidato_id,
        type: notificationType,
        title,
        message,
        related_type: 'inscricao',
        related_id: inscricaoId
      });

    if (notifError) {
      console.error('Erro ao criar notificação:', notifError);
    } else {
      console.log(`Notificação enviada com sucesso para candidato ${inscricao.candidato_id}`);
    }

    // Se for aprovação ou conclusão, notificar também o analista
    if ((type === 'aprovado' || type === 'concluido') && inscricao.analisado_por) {
      await supabaseClient
        .from('app_notifications')
        .insert({
          user_id: inscricao.analisado_por,
          type: 'info',
          title: type === 'aprovado' ? '✅ Aprovação Registrada' : '🎉 Processo Concluído',
          message: `O processo de credenciamento para o edital "${inscricao.editais?.titulo}" foi ${type === 'aprovado' ? 'aprovado' : 'concluído'}.`,
          related_type: 'inscricao',
          related_id: inscricaoId
        });
    }
  } catch (error) {
    console.error('Erro ao enviar notificações:', error);
  }
}