/**
 * Executor para nós do tipo CONDITION
 */

import { NodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from './types.ts';

export class ConditionExecutor implements NodeExecutor {
  async execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    console.log('[CONDITION_EXECUTOR] Avaliando condição');
    
    // TODO: Implementar lógica de bifurcação condicional
    const conditionConfig = node.data.conditionConfig || {};
    
    return {
      outputData: context,
      shouldContinue: true
    };
  }
}
