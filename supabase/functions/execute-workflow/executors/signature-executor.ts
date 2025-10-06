/**
 * Executor para nós do tipo SIGNATURE
 */

import { NodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from './types.ts';

export class SignatureExecutor implements NodeExecutor {
  async execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    console.log(`[SIGNATURE_EXECUTOR] Nó SIGNATURE detectado`);
    
    const signatureConfig = node.data.signatureConfig || {};
    const DEV_MODE = Deno.env.get('ENVIRONMENT') !== 'production';
    
    // Criar signature request
    const { data: signatureRequest, error: sigError } = await supabaseClient
      .from('signature_requests')
      .insert({
        workflow_execution_id: executionId,
        step_execution_id: stepExecutionId,
        provider: signatureConfig.provider || 'manual',
        signers: signatureConfig.signers || [],
        document_url: signatureConfig.documentUrl,
        status: 'pending',
        metadata: DEV_MODE ? { dev_mode: true } : {}
      })
      .select()
      .single();
    
    if (sigError) {
      console.error(`[SIGNATURE_EXECUTOR] ❌ Erro ao criar signature request:`, sigError);
      throw sigError;
    }
    
    console.log(`[SIGNATURE_EXECUTOR] ✅ Signature request criada: ${signatureRequest.id}`);
    
    // MODO DEV: simular callback automático após 10s
    if (DEV_MODE && signatureRequest.provider === 'manual') {
      console.log(`[SIGNATURE_EXECUTOR] 🔧 DEV MODE: agendando auto-complete em 10s`);
      
      // Adicionar job na fila para simular callback
      await supabaseClient.from('workflow_queue').insert({
        inscricao_id: null,
        workflow_id: executionId,
        workflow_version: 1,
        input_data: {
          __dev_callback: true,
          signature_request_id: signatureRequest.id,
          step_execution_id: stepExecutionId,
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
        console.error(`[SIGNATURE_EXECUTOR] ❌ Erro ao enviar signature request:`, sendError);
      } else {
        console.log(`[SIGNATURE_EXECUTOR] ✅ Signature request enviada`);
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
      .eq("id", stepExecutionId);
    
    console.log(`[SIGNATURE_EXECUTOR] ⏸️ Execução pausada aguardando assinatura`);
    
    return {
      outputData: context,
      shouldPause: true
    };
  }
}
