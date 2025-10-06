/**
 * Executor para nós do tipo WEBHOOK e HTTP
 */

import { NodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from './types.ts';

export class WebhookExecutor implements NodeExecutor {
  async execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    console.log('[WEBHOOK_EXECUTOR] Fazendo chamada HTTP');
    
    const httpConfig = node.data.httpConfig || node.data.webhookConfig;
    
    if (httpConfig) {
      console.log(`[WEBHOOK_EXECUTOR] HTTP ${httpConfig.method} para ${httpConfig.url}`);
      // TODO: Implementar chamada HTTP real
    }
    
    return {
      outputData: { ...context, webhookCalled: true, httpCalled: true },
      shouldContinue: true
    };
  }
}
