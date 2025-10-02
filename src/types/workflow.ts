export type WorkflowStepType = 
  | "submissao" 
  | "analise_documentos" 
  | "validacao_tecnica" 
  | "aprovacao_diretoria" 
  | "homologacao" 
  | "pendente_correcao"
  | "rejeitado"
  | "aprovado";

export interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  order: number;
  description: string;
  color: string;
  icon: string;
  requiredDocuments?: string[];
  autoAdvance?: boolean;
  daysToComplete?: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  editalId?: string;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  version: number;
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  templateVersion: number;
  processoId: number;
  currentStepId: string;
  startedAt: string;
  completedAt?: string;
  status: "active" | "completed" | "cancelled";
}

export interface WorkflowAction {
  id: string;
  workflowInstanceId: string;
  stepId: string;
  action: "advance" | "reject" | "request_info" | "approve" | "cancel";
  performedBy: string;
  performedAt: string;
  comment?: string;
  metadata?: Record<string, any>;
}
