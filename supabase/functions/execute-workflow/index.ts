/**
 * FASE 6-10: Execute Workflow - Motor principal de execução de workflows
 * 
 * ARQUITETURA MODULAR:
 * Este arquivo atua apenas como ORQUESTRADOR, delegando a execução de cada nó
 * para executores especializados seguindo o padrão Strategy.
 * 
 * Responsabilidades do Orquestrador:
 * 1. Criar e iniciar execução de workflow
 * 2. Validar autenticação e workflow
 * 3. Vincular com inscricao_edital (se aplicável)
 * 4. Coordenar execução sequencial dos nós via executeWorkflowSteps()
 * 5. Gerenciar contexto entre nós
 * 6. Registrar histórico de execução em workflow_step_executions
 * 7. Sincronizar status com inscricoes_edital
 * 
 * Tipos de Nós Suportados (via executores modulares):
 * - start: Ponto de entrada do workflow
 * - form: Coleta de dados via formulário
 * - email: Envio de e-mails templated
 * - webhook/http: Chamadas HTTP externas
 * - database: Atualizações no banco
 * - signature: Solicitação de assinaturas (Assinafy)
 * - ocr: Processamento de OCR (Google Vision)
 * - approval: Ponto de aprovação manual
 * - condition: Ramificação condicional
 * - end: Finalização do workflow
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { WorkflowNode, WorkflowEdge, ExecutionContext } from './executors/types.ts';
import { getExecutor, hasExecutor } from './executors/index.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Usar SERVICE_ROLE_KEY para operações internas do worker
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { workflowId, inputData, inscricaoId, continueFrom } = await req.json();

    // 🔍 Etapa 1: Log detalhado de entrada
    console.log('[WORKFLOW] 🚀 Função chamada:', {
      workflowId,
      inscricaoId,
      hasInputData: !!inputData,
      source: 'worker'
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
        started_by: null, // Worker executa sem contexto de usuário
        status: "running",
      })
      .select()
      .single();

    if (executionError) throw executionError;

    // 🔍 Etapa 1: Log de execução criada com sucesso
    console.log(`[WORKFLOW] ✅ Execução criada: ${execution.id} | Workflow: ${workflow.name} | Source: worker`);

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

    // Determinar nó inicial
    const edges = workflow.edges as WorkflowEdge[];
    let initialNode = startNode;
    
    // Se continueFrom foi especificado, iniciar daquele nó
    if (continueFrom) {
      const continueNode = nodes.find(n => n.id === continueFrom);
      if (continueNode) {
        console.log(`[WORKFLOW] 🔄 Continuando execução do nó: ${continueFrom}`);
        initialNode = continueNode;
      } else {
        console.warn(`[WORKFLOW] ⚠️ Nó continueFrom não encontrado: ${continueFrom}, usando start`);
      }
    }

    // 🔍 Etapa 2: Log antes de iniciar steps
    console.log(`[WORKFLOW] 🚀 Iniciando executeWorkflowSteps:`, {
      executionId: execution.id,
      startNodeId: initialNode.id,
      startNodeType: initialNode.data.type,
      continueFrom: continueFrom || 'início',
      totalNodes: nodes.length,
      totalEdges: edges.length
    });

    // Executar workflow em background
    executeWorkflowSteps(
      supabaseClient,
      execution.id,
      nodes,
      edges,
      initialNode,
      inputData
    ).catch((error) => {
      console.error(`[WORKFLOW] ❌ ERRO na execução do workflow ${execution.id}:`, {
        message: error.message,
        stack: error.stack
      });
      supabaseClient
        .from("workflow_executions")
        .update({
          status: "failed",
          error_message: error.message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", execution.id)
        .then(() => console.log(`[WORKFLOW] ⚠️ Execução ${execution.id} marcada como falhada`));
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

/**
 * ORQUESTRADOR DE EXECUÇÃO DE NÓS
 * 
 * Esta função atua como coordenador, delegando a execução de cada nó
 * para seu executor especializado via padrão Strategy.
 * 
 * Fluxo:
 * 1. Criar step_execution
 * 2. Obter executor apropriado via getExecutor()
 * 3. Delegar execução ao executor
 * 4. Processar resultado (pause, continue, error)
 * 5. Navegar para próximo nó se aplicável
 */
async function executeWorkflowSteps(
  supabaseClient: any,
  executionId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  currentNode: WorkflowNode,
  context: ExecutionContext
) {
  // 🔍 Log detalhado do nó sendo executado
  console.log(`[WORKFLOW] 📍 Executando nó:`, {
    nodeId: currentNode.id,
    nodeType: currentNode.data.type,
    nodeLabel: currentNode.data.label,
    executionId,
    hasContext: !!context,
    contextSize: context ? Object.keys(context).length : 0
  });

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

  if (stepError) {
    console.error(`[WORKFLOW] ❌ Erro ao criar step_execution:`, stepError);
    throw stepError;
  }
  
  console.log(`[WORKFLOW] ✅ Step execution criado:`, {
    stepExecutionId: stepExecution.id,
    nodeId: currentNode.id,
    status: stepExecution.status
  });

  try {
    // ORQUESTRAÇÃO: Obter executor apropriado para o tipo de nó
    const nodeType = currentNode.data.type;
    
    if (!hasExecutor(nodeType)) {
      console.error(`[WORKFLOW] ❌ Tipo de nó desconhecido: ${nodeType}`);
      throw new Error(`Tipo de nó não suportado: ${nodeType}`);
    }
    
    const executor = getExecutor(nodeType);
    
    // DELEGAÇÃO: Executar nó via executor especializado
    console.log(`[WORKFLOW] 🎯 Delegando execução para ${nodeType}Executor`);
    const result = await executor.execute(
      supabaseClient,
      executionId,
      stepExecution.id,
      currentNode,
      context
    );

    // Processar resultado da execução
    const { outputData, shouldPause, shouldContinue } = result;
    
    // Se deve pausar (form incompleto, signature, approval), parar aqui
    if (shouldPause) {
      console.log(`[WORKFLOW] ⏸️ Execução pausada no nó ${currentNode.id}`);
      return;
    }
    
    // Se é nó END, não continuar
    if (currentNode.data.type === "end" || shouldContinue === false) {
      console.log(`[WORKFLOW] 🏁 Workflow finalizado`);
      return;
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

    // Navegar para o próximo nó
    const nextEdge = edges.find((e) => e.source === currentNode.id);
    if (nextEdge) {
      const nextNode = nodes.find((n) => n.id === nextEdge.target);
      if (nextNode) {
        console.log(`[WORKFLOW] ➡️ Navegando para próximo nó: ${nextNode.id}`);
        await executeWorkflowSteps(
          supabaseClient,
          executionId,
          nodes,
          edges,
          nextNode,
          outputData
        );
      } else {
        console.warn(`[WORKFLOW] ⚠️ Próximo nó não encontrado para edge ${nextEdge.id}`);
      }
    } else {
      console.log(`[WORKFLOW] 🏁 Nenhum próximo nó encontrado, finalizando`);
      await supabaseClient
        .from("workflow_executions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", executionId);
    }
  } catch (error) {
    console.error(`[WORKFLOW] ❌ Erro ao executar nó ${currentNode.id}:`, error);
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

/**
 * FUNÇÃO AUXILIAR: Notificar stakeholders
 * (Mantida para compatibilidade, mas não está sendo usada atualmente)
 */
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
