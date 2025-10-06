/**
 * FASE 6-10: Execute Workflow - Motor principal de execução de workflows
 * 
 * Responsabilidades:
 * 1. Criar e iniciar execução de workflow
 * 2. Processar cada nó sequencialmente (start → steps → end)
 * 3. Gerenciar contexto entre nós
 * 4. Registrar histórico de execução em workflow_step_executions
 * 5. Sincronizar status com inscricoes_edital
 * 
 * Tipos de Nós Suportados:
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
 * 
 * Fluxo de Execução:
 * 1. Validar autenticação e workflow
 * 2. Criar workflow_execution
 * 3. Vincular com inscricao_edital (se aplicável)
 * 4. Executar nós recursivamente via executeWorkflowSteps()
 * 5. Atualizar status final
 */

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

async function executeWorkflowSteps(
  supabaseClient: any,
  executionId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  currentNode: WorkflowNode,
  context: any
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
    let outputData = context;

    // Executar lógica baseada no tipo de nó
    switch (currentNode.data.type) {
      case "start":
        console.log("Nó inicial - configuração:", currentNode.data.triggerConfig);
        // Logica de trigger já foi processada no início da execução
        break;

      case "form":
        console.log(`[WORKFLOW] 📝 Nó FORM detectado: ${currentNode.id}`);
        
        const formFields = currentNode.data.formFields || [];
        const forcePause = currentNode.data.forcePause || false;
        
        // Verificar campos obrigatórios faltando
        const missingRequired = formFields
          .filter((f: any) => f.required && !context?.[f.name])
          .map((f: any) => f.name);
        
        // DECISÃO: pausar se forcePause=true OU campos obrigatórios faltam
        const shouldPause = forcePause || missingRequired.length > 0;
        
        if (shouldPause) {
          console.log(`[WORKFLOW] ⏸️ Pausando - campos faltando: ${missingRequired.join(', ')}`);
          await supabaseClient
            .from("workflow_step_executions")
            .update({
              status: "paused",
              output_data: { 
                formFields,
                missingFields: missingRequired,
                pausedAt: new Date().toISOString()
              }
            })
            .eq("id", stepExecution.id);
          return;
        }
        
        // Se tudo OK, pular
        console.log(`[WORKFLOW] ✅ Todos campos presentes, pulando formulário`);
        await supabaseClient
          .from("workflow_step_executions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            output_data: { skipped: true, formData: context }
          })
          .eq("id", stepExecution.id);
        
        outputData = { ...context };
        
        // Avançar automaticamente
        const nextEdge = edges.find((e: WorkflowEdge) => e.source === currentNode.id);
        if (nextEdge) {
          const nextNode = nodes.find((n: WorkflowNode) => n.id === nextEdge.target);
          if (nextNode) {
            console.log(`[WORKFLOW] ➡️ Avançando para: ${nextNode.id}`);
            await executeWorkflowSteps(supabaseClient, executionId, nodes, edges, nextNode, outputData);
          }
        }
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
        console.log(`[WORKFLOW] 💾 Executando operação de banco de dados`);
        const dbConfig = currentNode.data.databaseConfig;
        
        if (dbConfig && dbConfig.table && dbConfig.operation) {
          console.log(`[WORKFLOW] 💾 DB Operation: ${dbConfig.operation} em ${dbConfig.table}`);
          
          try {
            const tableName = dbConfig.table;
            const operation = dbConfig.operation;
            const fields = dbConfig.fields || {};
            
            // Resolver variáveis nos campos usando context
            const resolvedFields: Record<string, any> = {};
            for (const [key, value] of Object.entries(fields)) {
              if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
                // Extrair path da variável: {inscricao.id} -> ['inscricao', 'id']
                const varPath = value.slice(1, -1).split('.');
                let resolvedValue = context;
                for (const part of varPath) {
                  resolvedValue = resolvedValue?.[part];
                }
                resolvedFields[key] = resolvedValue;
              } else {
                resolvedFields[key] = value;
              }
            }
            
            console.log(`[WORKFLOW] 💾 Campos resolvidos:`, resolvedFields);
            
            // Executar operação no banco
            let dbResult;
            switch (operation) {
              case 'insert':
                dbResult = await supabaseClient
                  .from(tableName)
                  .insert(resolvedFields)
                  .select();
                break;
              
              case 'update':
                const updateConditions = dbConfig.conditions || {};
                let updateQuery = supabaseClient.from(tableName).update(resolvedFields);
                
                for (const [condKey, condValue] of Object.entries(updateConditions)) {
                  updateQuery = updateQuery.eq(condKey, condValue);
                }
                
                dbResult = await updateQuery.select();
                break;
              
              case 'delete':
                const deleteConditions = dbConfig.conditions || {};
                let deleteQuery = supabaseClient.from(tableName).delete();
                
                for (const [condKey, condValue] of Object.entries(deleteConditions)) {
                  deleteQuery = deleteQuery.eq(condKey, condValue);
                }
                
                dbResult = await deleteQuery;
                break;
              
              default:
                throw new Error(`Operação de banco não suportada: ${operation}`);
            }
            
            if (dbResult.error) {
              throw dbResult.error;
            }
            
            console.log(`[WORKFLOW] ✅ Operação de banco concluída com sucesso`);
            outputData = { 
              ...context, 
              dbOperation: true, 
              dbResult: dbResult.data,
              dbOperation_success: true
            };
            
          } catch (dbError: any) {
            console.error(`[WORKFLOW] ❌ Erro na operação de banco:`, dbError);
            outputData = { 
              ...context, 
              dbOperation: false,
              dbError: dbError.message,
              dbOperation_success: false
            };
            throw new Error(`Erro ao executar operação no banco: ${dbError.message}`);
          }
        } else {
          console.warn(`[WORKFLOW] ⚠️ Nó database sem configuração válida`);
          outputData = { ...context, dbOperation: false };
        }
        break;

      case "signature":
        console.log(`[WORKFLOW] ✍️ Nó SIGNATURE detectado`);
        const signatureConfig = currentNode.data.signatureConfig || {};
        const DEV_MODE = Deno.env.get('ENVIRONMENT') !== 'production';
        
        // Criar signature request
        const { data: signatureRequest, error: sigError } = await supabaseClient
          .from('signature_requests')
          .insert({
            workflow_execution_id: executionId,
            step_execution_id: stepExecution.id,
            provider: signatureConfig.provider || 'manual',
            signers: signatureConfig.signers || [],
            document_url: signatureConfig.documentUrl,
            status: 'pending',
            metadata: DEV_MODE ? { dev_mode: true } : {}
          })
          .select()
          .single();
        
        if (sigError) {
          console.error(`[WORKFLOW] ❌ Erro ao criar signature request:`, sigError);
          throw sigError;
        }
        
        console.log(`[WORKFLOW] ✅ Signature request criada: ${signatureRequest.id}`);
        
        // MODO DEV: simular callback automático após 10s
        if (DEV_MODE && signatureRequest.provider === 'manual') {
          console.log(`[WORKFLOW] 🔧 DEV MODE: agendando auto-complete em 10s`);
          
          // Adicionar job na fila para simular callback
          await supabaseClient.from('workflow_queue').insert({
            inscricao_id: null,
            workflow_id: executionId,
            workflow_version: 1,
            input_data: {
              __dev_callback: true,
              signature_request_id: signatureRequest.id,
              step_execution_id: stepExecution.id,
              execution_id: executionId,
              delay_seconds: 10
            },
            status: 'pending',
            attempts: 0
          });
        } else {
          // MODO PROD: invocar send-signature-request real
          const { error: sendError } = await supabaseClient.functions.invoke(
            'send-signature-request',
            { body: { signatureRequestId: signatureRequest.id } }
          );
          
          if (sendError) {
            console.error(`[WORKFLOW] ❌ Erro ao enviar signature request:`, sendError);
          } else {
            console.log(`[WORKFLOW] ✅ Signature request enviada`);
          }
        }
        
        // Pausar com status 'paused'
        await supabaseClient
          .from("workflow_step_executions")
          .update({
            status: "paused",
            output_data: { 
              signatureRequestId: signatureRequest.id,
              pausedAt: new Date().toISOString(),
              devMode: DEV_MODE
            }
          })
          .eq("id", stepExecution.id);
        
        console.log(`[WORKFLOW] ⏸️ Execução pausada aguardando assinatura`);
        return;

      case "ocr":
        console.log(`[WORKFLOW] 📄 Nó OCR detectado`);
        const ocrConfig = currentNode.data.ocrConfig || {};
        
        // Buscar documento para processar OCR
        let documentUrl = ocrConfig.documentUrl;
        
        // Se documentUrl é uma variável, resolver do context
        if (documentUrl && documentUrl.startsWith('{')) {
          const varPath = documentUrl.slice(1, -1).split('.');
          let resolved = context;
          for (const part of varPath) {
            resolved = resolved?.[part];
          }
          documentUrl = resolved;
        }
        
        if (!documentUrl) {
          console.error(`[WORKFLOW] ❌ URL do documento não fornecida para OCR`);
          outputData = { ...context, ocrSuccess: false, ocrError: 'URL do documento não fornecida' };
          break;
        }
        
        console.log(`[WORKFLOW] 📄 Processando OCR para documento: ${documentUrl}`);
        
        // Invocar edge function de OCR
        const { data: ocrResult, error: ocrError } = await supabaseClient.functions.invoke(
          'process-ocr',
          { body: { imageUrl: documentUrl, fieldMappings: ocrConfig.fieldMappings || [] } }
        );
        
        if (ocrError) {
          console.error(`[WORKFLOW] ❌ Erro ao processar OCR:`, ocrError);
          outputData = { ...context, ocrSuccess: false, ocrError: ocrError.message };
        } else {
          console.log(`[WORKFLOW] ✅ OCR processado com sucesso`);
          outputData = { 
            ...context, 
            ocrSuccess: true, 
            ocrData: ocrResult,
            ...ocrResult?.extractedData // Mesclar dados extraídos no context
          };
        }
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