/**
 * Executor para nós do tipo OCR
 */

import { NodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from './types.ts';

export class OcrExecutor implements NodeExecutor {
  async execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    console.log(`[OCR_EXECUTOR] Nó OCR detectado`);
    
    const ocrConfig = node.data.ocrConfig || {};
    
    // Buscar documento para processar OCR
    let documentUrl = ocrConfig.documentUrl;
    
    // Se documentUrl é uma variável, resolver do context
    if (documentUrl && documentUrl.startsWith('{')) {
      const varPath = documentUrl.slice(1, -1).split('.');
      let resolved = context;
      for (const part of varPath) {
        resolved = resolved?.[part];
      }
      documentUrl = resolved;
    }
    
    if (!documentUrl) {
      console.error(`[OCR_EXECUTOR] ❌ URL do documento não fornecida para OCR`);
      return {
        outputData: { ...context, ocrSuccess: false, ocrError: 'URL do documento não fornecida' },
        shouldContinue: true
      };
    }
    
    console.log(`[OCR_EXECUTOR] Processando OCR para documento: ${documentUrl}`);
    
    // Invocar edge function de OCR
    const { data: ocrResult, error: ocrError } = await supabaseClient.functions.invoke(
      'process-ocr',
      { body: { imageUrl: documentUrl, fieldMappings: ocrConfig.fieldMappings || [] } }
    );
    
    if (ocrError) {
      console.error(`[OCR_EXECUTOR] ❌ Erro ao processar OCR:`, ocrError);
      return {
        outputData: { ...context, ocrSuccess: false, ocrError: ocrError.message },
        shouldContinue: true
      };
    }
    
    console.log(`[OCR_EXECUTOR] ✅ OCR processado com sucesso`);
    
    // Mapear campos extraídos para o contexto conforme fieldMappings
    const mappedData: Record<string, any> = {};
    const fieldMappings = ocrConfig.fieldMappings || [];
    
    if (ocrResult?.extractedData && fieldMappings.length > 0) {
      for (const mapping of fieldMappings) {
        const sourceField = mapping.ocrField || mapping.sourceField;
        const targetField = mapping.contextField || mapping.targetField;
        
        if (sourceField && targetField && ocrResult.extractedData[sourceField] !== undefined) {
          mappedData[targetField] = ocrResult.extractedData[sourceField];
          console.log(`[OCR_EXECUTOR] Mapeado: ${sourceField} -> ${targetField} = ${mappedData[targetField]}`);
        }
      }
    } else if (ocrResult?.extractedData) {
      // Se não há mappings, mesclar todos os dados extraídos
      Object.assign(mappedData, ocrResult.extractedData);
    }
    
    return {
      outputData: { 
        ...context, 
        ocrSuccess: true, 
        ocrData: ocrResult,
        ...mappedData // Dados mapeados no contexto
      },
      shouldContinue: true
    };
  }
}
