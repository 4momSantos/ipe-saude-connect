/**
 * Executor para nós do tipo EMAIL
 */

import { NodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from './types.ts';

export class EmailExecutor implements NodeExecutor {
  async execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    console.log('[EMAIL_EXECUTOR] Enviando email (simulado)');
    
    // TODO: Implementar envio real via send-templated-email
    const emailConfig = node.data.emailConfig || {};
    
    return {
      outputData: { ...context, emailSent: true },
      shouldContinue: true
    };
  }
}
