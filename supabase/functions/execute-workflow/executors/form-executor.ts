/**
 * Executor para nós do tipo FORM
 */

import { NodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from './types.ts';

export class FormExecutor implements NodeExecutor {
  async execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    console.log(`[FORM_EXECUTOR] Nó FORM detectado: ${node.id}`);
    
    const formFields = node.data.formFields || [];
    const forcePause = node.data.forcePause || false;
    
    // Verificar campos obrigatórios faltando
    const missingRequired = formFields
      .filter((f: any) => f.required && !context?.[f.name])
      .map((f: any) => f.name);
    
    // DECISÃO: pausar se forcePause=true OU campos obrigatórios faltam
    const shouldPause = forcePause || missingRequired.length > 0;
    
    if (shouldPause) {
      console.log(`[FORM_EXECUTOR] ⏸️ Pausando - campos faltando: ${missingRequired.join(', ')}`);
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
        .eq("id", stepExecutionId);
      
      return {
        outputData: context,
        shouldPause: true
      };
    }
    
    // Se tudo OK, pular
    console.log(`[FORM_EXECUTOR] ✅ Todos campos presentes, pulando formulário`);
    await supabaseClient
      .from("workflow_step_executions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        output_data: { skipped: true, formData: context }
      })
      .eq("id", stepExecutionId);
    
    return {
      outputData: { ...context },
      shouldContinue: true
    };
  }
}
