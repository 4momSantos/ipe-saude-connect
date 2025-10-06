/**
 * Executor para nós do tipo START
 */

import { NodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from './types.ts';

export class StartExecutor implements NodeExecutor {
  async execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    console.log('[START_EXECUTOR] Nó inicial - configuração:', node.data.triggerConfig);
    
    // Logica de trigger já foi processada no início da execução
    return {
      outputData: context,
      shouldContinue: true
    };
  }
}
