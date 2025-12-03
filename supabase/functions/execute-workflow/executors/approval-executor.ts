/**
 * Executor para nós do tipo APPROVAL
 */

import { NodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from './types.ts';

export class ApprovalExecutor implements NodeExecutor {
  async execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    console.log('[APPROVAL_EXECUTOR] Aguardando aprovação');
    
    // Obter configuração de aprovação do nó
    const approvalConfig = node.data.approvalConfig || { assignmentType: "all" };
    
    // Buscar analistas responsáveis
    const assignedAnalysts = await this.getAssignedAnalysts(supabaseClient, approvalConfig);
    
    // Criar registros de aprovação para cada analista
    if (assignedAnalysts.length > 0) {
      await this.createApprovalRecords(supabaseClient, stepExecutionId, assignedAnalysts);
      await this.notifyAnalysts(supabaseClient, stepExecutionId, assignedAnalysts);
    }
    
    await supabaseClient
      .from("workflow_step_executions")
      .update({
        status: "pending",
        output_data: { assignedAnalysts, approvalConfig },
        completed_at: new Date().toISOString(),
      })
      .eq("id", stepExecutionId);
    
    // Workflow fica pendente até aprovação
    console.log(`[APPROVAL_EXECUTOR] ⏸️ Execução ${executionId} pausada na aprovação ${node.id}`);
    
    return {
      outputData: context,
      shouldPause: true
    };
  }
  
  private async getAssignedAnalysts(supabaseClient: any, approvalConfig: any): Promise<string[]> {
    let assignedAnalysts: string[] = [];
    
    if (approvalConfig.assignmentType === "all") {
      // Buscar todos os analistas
      const { data: allAnalysts } = await supabaseClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "analista");
      
      assignedAnalysts = allAnalysts?.map((a: { user_id: string }) => a.user_id) || [];
      console.log('[APPROVAL_EXECUTOR] Aprovação atribuída a todos os analistas:', assignedAnalysts.length);
      
    } else if (approvalConfig.assignmentType === "specific") {
      // Analistas específicos
      assignedAnalysts = approvalConfig.assignedAnalysts || [];
      console.log('[APPROVAL_EXECUTOR] Aprovação atribuída a analistas específicos:', assignedAnalysts.length);
      
    } else if (approvalConfig.assignmentType === "groups") {
      // Buscar membros dos grupos selecionados
      const { data: groupMembers } = await supabaseClient
        .from("membros_grupos")
        .select("user_id")
        .in("grupo_id", approvalConfig.assignedGroups || [])
        .eq("ativo", true);
      
      assignedAnalysts = [...new Set(groupMembers?.map((m: { user_id: string }) => m.user_id) || [])] as string[];
      console.log('[APPROVAL_EXECUTOR] Aprovação atribuída a membros de grupos:', assignedAnalysts.length, 'usuários únicos');
      
    } else if (approvalConfig.assignmentType === "mixed") {
      // Combinar analistas + membros de grupos
      const directAnalysts = approvalConfig.assignedAnalysts || [];
      
      const { data: groupMembers } = await supabaseClient
        .from("membros_grupos")
        .select("user_id")
        .in("grupo_id", approvalConfig.assignedGroups || [])
        .eq("ativo", true);
      
      const groupAnalysts = groupMembers?.map((m: { user_id: string }) => m.user_id) || [];
      
      // Remover duplicatas
      assignedAnalysts = [...new Set([...directAnalysts, ...groupAnalysts])];
      console.log('[APPROVAL_EXECUTOR] Aprovação atribuída via modo misto:', assignedAnalysts.length, 'usuários únicos');
    }
    
    return assignedAnalysts;
  }
  
  private async createApprovalRecords(
    supabaseClient: any,
    stepExecutionId: string,
    assignedAnalysts: string[]
  ): Promise<void> {
    const approvalRecords = assignedAnalysts.map(analystId => ({
      step_execution_id: stepExecutionId,
      approver_id: analystId,
      decision: "pending",
    }));
    
    const { error: approvalError } = await supabaseClient
      .from("workflow_approvals")
      .insert(approvalRecords);
    
    if (approvalError) {
      console.error('[APPROVAL_EXECUTOR] Erro ao criar registros de aprovação:', approvalError);
    } else {
      console.log('[APPROVAL_EXECUTOR] Registros de aprovação criados:', approvalRecords.length);
    }
  }
  
  private async notifyAnalysts(
    supabaseClient: any,
    stepExecutionId: string,
    assignedAnalysts: string[]
  ): Promise<void> {
    const notifications = assignedAnalysts.map(analystId => ({
      user_id: analystId,
      type: "info",
      title: "⏰ Nova Aprovação Pendente",
      message: `Inscrição aguarda sua análise`,
      related_type: "workflow_approval",
      related_id: stepExecutionId
    }));
    
    const { error: notifError } = await supabaseClient
      .from("app_notifications")
      .insert(notifications);
    
    if (notifError) {
      console.error("[APPROVAL_EXECUTOR] ❌ Erro ao criar notificações:", notifError);
    } else {
      console.log(`[APPROVAL_EXECUTOR] ✅ ${notifications.length} notificações enviadas`);
    }
  }
}
