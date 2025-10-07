import { FormField } from "@/types/workflow-editor";

/**
 * Interface para anexo esperado do processo
 */
export interface AnexoProcessoEsperado {
  id: string;
  label: string;
  nodeId: string;
  nodeName: string;
  required: boolean;
  acceptedFiles?: string[];
  maxFileSize?: number;
  ocrConfig?: any;
}

/**
 * Interface para formulário vinculado
 */
export interface FormularioVinculado {
  id: string;
  name: string;
  nodeId: string;
  ordem: number;
  tipo: string;
}

/**
 * Resultado do mapeamento do workflow para edital
 */
export interface WorkflowEditalMapping {
  workflow_id: string;
  formularios_vinculados: FormularioVinculado[];
  anexos_processo_esperados: AnexoProcessoEsperado[];
}

/**
 * Sprint 2: Mapeia workflow de VALIDAÇÃO (não coleta dados)
 * Workflows agora apenas definem fluxo de aprovação, não formulários
 */
export function mapWorkflowToEdital(workflow: any): WorkflowEditalMapping {
  console.log('[mapWorkflowToEdital] Workflow de validação recebido:', workflow.name);
  console.log('[mapWorkflowToEdital] Total de nós:', workflow.nodes?.length || 0);
  
  // Workflows de validação não devem ter formulários
  // A coleta de dados vem do inscription_template, não do workflow
  console.log('[mapWorkflowToEdital] ✅ Workflow mapeado (sem formulários, apenas validação)');

  return {
    workflow_id: workflow.id,
    formularios_vinculados: [],
    anexos_processo_esperados: []
  };
}

/**
 * Sprint 2: Valida workflow de VALIDAÇÃO/APROVAÇÃO
 * Não precisa ter formulários, mas deve ter nós de aprovação/condição
 */
export function validateWorkflowForEdital(workflow: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!workflow) {
    errors.push('Workflow não encontrado');
    return { isValid: false, errors, warnings };
  }

  if (!workflow.nodes || workflow.nodes.length === 0) {
    errors.push('Workflow não possui nós');
    return { isValid: false, errors, warnings };
  }

  // Verificar se tem nó inicial
  const hasStartNode = workflow.nodes.some((n: any) => n.type === 'start');
  if (!hasStartNode) {
    errors.push('Workflow deve ter um nó de início (start)');
  }

  // Verificar se tem pelo menos um nó de validação/aprovação
  const validationNodes = workflow.nodes.filter((n: any) => 
    ['approval', 'signature', 'condition', 'database'].includes(n.type)
  );
  
  if (validationNodes.length === 0) {
    warnings.push('Workflow não possui nós de validação (approval, signature, condition ou database)');
  }

  console.log(`[validateWorkflowForEdital] ✅ Workflow válido para validação (${validationNodes.length} nós de validação)`);

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
