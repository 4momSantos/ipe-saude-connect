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
 * Mapeia um workflow para os dados necessários do edital
 * Extrai formulários e anexos esperados dos nós do tipo 'form'
 */
export function mapWorkflowToEdital(workflow: any): WorkflowEditalMapping {
  console.log('[mapWorkflowToEdital] Workflow recebido:', workflow);
  console.log('[mapWorkflowToEdital] Total de nós:', workflow.nodes?.length || 0);
  
  // Log todos os tipos de nós para debug
  const nodeTypes = workflow.nodes?.map((n: any) => ({ id: n.id, type: n.type, data: n.data })) || [];
  console.log('[mapWorkflowToEdital] TODOS os nós com seus tipos:', nodeTypes);
  
  const formNodes = workflow.nodes?.filter((n: any) => n.type === 'form') || [];
  console.log('[mapWorkflowToEdital] Nós do tipo "form" encontrados:', formNodes.length);
  console.log('[mapWorkflowToEdital] Nós form:', formNodes.map((n: any) => ({ id: n.id, type: n.type, data: n.data })));
  
  const formularios_vinculados: FormularioVinculado[] = formNodes
    .map((node: any, index: number) => ({
      id: node.data?.formulario_id || node.id,
      name: node.data?.label || `Formulário ${index + 1}`,
      nodeId: node.id,
      ordem: index + 1,
      tipo: node.data?.formType || 'generico'
    }))
    .filter((f: FormularioVinculado) => f.id);
  
  console.log('[mapWorkflowToEdital] Formulários vinculados:', formularios_vinculados);

  const anexos_processo_esperados: AnexoProcessoEsperado[] = formNodes
    .flatMap((node: any) => {
      const formFields: FormField[] = node.data?.formFields || [];
      console.log(`[mapWorkflowToEdital] Nó ${node.id}: ${formFields.length} campo(s) no formulário`);
      
      const fileFields = formFields.filter((field: FormField) => field.type === 'file');
      console.log(`[mapWorkflowToEdital] Nó ${node.id}: ${fileFields.length} campo(s) do tipo "file"`);
      
      return fileFields.map((field: FormField) => ({
        id: field.id,
        label: field.label,
        nodeId: node.id,
        nodeName: node.data?.label || 'Formulário',
        required: field.validation?.required || false,
        acceptedFiles: field.acceptedFiles,
        maxFileSize: field.maxFileSize,
        ocrConfig: field.ocrConfig
      }));
    });
  
  console.log('[mapWorkflowToEdital] Anexos de processo esperados:', anexos_processo_esperados);

  return {
    workflow_id: workflow.id,
    formularios_vinculados,
    anexos_processo_esperados
  };
}

/**
 * Valida se um workflow está apto para ser vinculado a um edital
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

  const formNodes = workflow.nodes.filter((n: any) => n.type === 'form');
  
  if (formNodes.length === 0) {
    errors.push('Workflow não possui nós do tipo "form"');
  }

  const hasStartNode = workflow.nodes.some((n: any) => n.type === 'start');
  if (!hasStartNode) {
    warnings.push('Workflow não possui nó inicial');
  }

  const mapping = mapWorkflowToEdital(workflow);
  
  if (mapping.formularios_vinculados.length === 0) {
    warnings.push('Nenhum formulário foi encontrado no workflow');
  }

  if (mapping.anexos_processo_esperados.length === 0) {
    warnings.push('Nenhum campo de anexo foi encontrado nos formulários do workflow');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
