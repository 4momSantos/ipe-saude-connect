/**
 * Executor para nós do tipo END
 */

import { NodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from './types.ts';

export class EndExecutor implements NodeExecutor {
  async execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    console.log(`[END_EXECUTOR] Finalizando workflow: ${executionId}`);
    
    // Atualizar status do workflow
    await supabaseClient
      .from("workflow_executions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", executionId);

    console.log(`[END_EXECUTOR] Workflow ${executionId} finalizado com sucesso`);
    // Nota: A sincronização de status para inscricao será feita pelo trigger sync_workflow_status_to_inscricao
    
    return {
      outputData: context,
      shouldContinue: false
    };
  }
}
