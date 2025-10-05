import { simulateOCR, OCRResult } from './ocr-simulator';
import { 
  validateCPFData, 
  validateCNPJData, 
  validateCRM, 
  validateNIT 
} from './validators';
import { OCRConfig, OCRFieldMapping } from '@/types/workflow-editor';

export interface OCRFieldValidation {
  field: string;
  status: "valid" | "invalid" | "warning" | "pending";
  message?: string;
  comparisonResult?: boolean;
  apiValidation?: {
    valid: boolean;
    data?: any;
    message?: string;
  };
  extractedValue?: any;
  formValue?: any;
}

export interface OCRValidationResult {
  success: boolean;
  extractedData: Record<string, any>;
  validations: OCRFieldValidation[];
  overallConfidence: number;
  errors: string[];
  warnings: string[];
  overallStatus: 'success' | 'warning' | 'error' | 'pending';
  missingRequiredFields: string[];
  completenessScore: number; // 0-100
}

/**
 * Processa upload com OCR e validações configuradas
 */
export async function processOCRWithValidation(
  file: File,
  ocrConfig: OCRConfig,
  formData: Record<string, any>,
  allFormFields: Array<{ id: string; label: string; type: string }>
): Promise<OCRValidationResult> {
  
  console.log('🔍 Iniciando processamento OCR:', {
    fileName: file.name,
    documentType: ocrConfig.documentType,
    expectedFields: ocrConfig.expectedFields.length
  });

  // 1. Extrair dados via OCR
  const ocrResult = await simulateOCR(file);
  
  if (!ocrResult.success) {
    return {
      success: false,
      extractedData: {},
      validations: [],
      overallConfidence: 0,
      errors: ocrResult.errors || ['Falha ao processar documento'],
      warnings: [],
      overallStatus: 'error',
      missingRequiredFields: [],
      completenessScore: 0
    };
  }

  const validations: OCRFieldValidation[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // 2. Validar cada campo esperado
  for (const fieldMapping of ocrConfig.expectedFields) {
    const validation = await validateOCRField(
      fieldMapping,
      ocrResult.extractedData,
      formData,
      allFormFields
    );
    
    validations.push(validation);

    // Coletar erros e avisos
    if (validation.status === 'invalid') {
      errors.push(validation.message || `Campo ${fieldMapping.ocrField} inválido`);
    } else if (validation.status === 'warning') {
      warnings.push(validation.message || `Atenção no campo ${fieldMapping.ocrField}`);
    }

    // Se campo obrigatório não foi extraído
    if (fieldMapping.required && !validation.extractedValue) {
      errors.push(`Campo obrigatório "${fieldMapping.ocrField}" não encontrado no documento`);
    }
  }

  // 3. Verificar confiança mínima
  const confidence = ocrResult.confidence || 0;
  if (confidence < ocrConfig.minConfidence) {
    warnings.push(
      `Confiança do OCR (${confidence}%) abaixo do mínimo esperado (${ocrConfig.minConfidence}%)`
    );
  }

  // 4. Calcular campos faltantes obrigatórios
  const missingRequiredFields = ocrConfig.expectedFields
    .filter(field => field.required && !ocrResult.extractedData[field.ocrField])
    .map(field => field.ocrField);

  // 5. Calcular completude (% de campos esperados que foram extraídos)
  const totalExpectedFields = ocrConfig.expectedFields.length;
  const extractedFieldsCount = ocrConfig.expectedFields.filter(
    field => ocrResult.extractedData[field.ocrField]
  ).length;
  const completenessScore = totalExpectedFields > 0 
    ? Math.round((extractedFieldsCount / totalExpectedFields) * 100)
    : 0;

  // 6. Determinar status geral
  let overallStatus: 'success' | 'warning' | 'error' | 'pending';
  if (errors.length > 0 || missingRequiredFields.length > 0) {
    overallStatus = 'error';
  } else if (warnings.length > 0) {
    overallStatus = 'warning';
  } else if (errors.length === 0 && validations.length > 0) {
    overallStatus = 'success';
  } else {
    overallStatus = 'pending';
  }

  return {
    success: errors.length === 0 && missingRequiredFields.length === 0,
    extractedData: ocrResult.extractedData,
    validations,
    overallConfidence: confidence,
    errors,
    warnings,
    overallStatus,
    missingRequiredFields,
    completenessScore
  };
}

/**
 * Valida um campo individual extraído do OCR
 */
async function validateOCRField(
  mapping: OCRFieldMapping,
  extractedData: Record<string, any>,
  formData: Record<string, any>,
  allFormFields: Array<{ id: string; label: string; type: string }>
): Promise<OCRFieldValidation> {
  
  const extractedValue = extractedData[mapping.ocrField];
  const formValue = mapping.formFieldId ? formData[mapping.formFieldId] : undefined;

  const validation: OCRFieldValidation = {
    field: mapping.ocrField,
    status: 'pending',
    extractedValue,
    formValue
  };

  // Se não foi extraído
  if (!extractedValue) {
    validation.status = mapping.required ? 'invalid' : 'warning';
    validation.message = mapping.errorMessage || `Campo "${mapping.ocrField}" não encontrado no documento`;
    return validation;
  }

  // Comparação com campo do formulário
  if (mapping.formFieldId && formValue) {
    const matches = compareValues(extractedValue, formValue);
    validation.comparisonResult = matches;
    
    if (!matches) {
      validation.status = 'warning';
      validation.message = `Valor extraído difere do informado no formulário`;
      return validation;
    }
  }

  // Validação via API
  if (mapping.validateAPI) {
    try {
      const apiResult = await callValidationAPI(
        mapping.validateAPI,
        extractedValue,
        extractedData,
        formData
      );
      
      validation.apiValidation = apiResult;
      
      if (!apiResult.valid) {
        validation.status = 'invalid';
        validation.message = apiResult.message || 'Validação API falhou';
      } else {
        validation.status = 'valid';
        validation.message = 'Validado com sucesso';
      }
    } catch (error) {
      validation.status = 'warning';
      validation.message = `Erro ao validar via API: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
    }
  } else {
    // Se não tem validação API, apenas confirma extração
    validation.status = 'valid';
    validation.message = 'Extraído com sucesso';
  }

  return validation;
}

/**
 * Compara dois valores normalizando
 */
function compareValues(value1: any, value2: any): boolean {
  const normalize = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val).trim().toLowerCase().replace(/[^\w]/g, '');
  };
  
  return normalize(value1) === normalize(value2);
}

/**
 * Chama API de validação apropriada
 */
async function callValidationAPI(
  apiName: string,
  value: any,
  extractedData: Record<string, any>,
  formData: Record<string, any>
): Promise<{ valid: boolean; data?: any; message?: string }> {
  
  console.log(`📡 Validando via API: ${apiName}`, { value });

  switch (apiName) {
    case 'validate-cpf': {
      const birthdate = extractedData.data_nascimento || formData.data_nascimento;
      if (!birthdate) {
        return { valid: false, message: 'Data de nascimento não informada' };
      }
      const result = await validateCPFData(value, birthdate);
      return {
        valid: result.valid,
        data: result.data,
        message: result.message
      };
    }

    case 'validate-cnpj': {
      const result = await validateCNPJData(value);
      return {
        valid: result.valid,
        data: result.data,
        message: result.message
      };
    }

    case 'validate-crm': {
      const uf = extractedData.uf_crm || formData.uf_crm;
      if (!uf) {
        return { valid: false, message: 'UF do CRM não informada' };
      }
      const result = await validateCRM(value, uf);
      return {
        valid: result.valid,
        data: result.data,
        message: result.message
      };
    }

    case 'validate-nit': {
      const cpf = extractedData.cpf || formData.cpf;
      const nome = extractedData.nome || formData.nome;
      const dataNascimento = extractedData.data_nascimento || formData.data_nascimento;
      
      if (!cpf || !nome || !dataNascimento) {
        return { valid: false, message: 'CPF, nome ou data de nascimento não informados' };
      }
      
      const result = await validateNIT(cpf, nome, dataNascimento);
      return {
        valid: result.valid,
        data: result.data,
        message: result.message
      };
    }

    default:
      return { valid: false, message: `API de validação desconhecida: ${apiName}` };
  }
}

/**
 * Obtém tipos de documento disponíveis
 */
export function getDocumentTypes() {
  return [
    { value: 'rg', label: 'RG (Registro Geral)' },
    { value: 'cnh', label: 'CNH (Carteira de Habilitação)' },
    { value: 'cpf', label: 'CPF' },
    { value: 'crm', label: 'CRM (Registro Médico)' },
    { value: 'cnpj', label: 'CNPJ' },
    { value: 'comprovante_endereco', label: 'Comprovante de Endereço' },
    { value: 'diploma', label: 'Diploma/Certificado' },
    { value: 'certidao', label: 'Certidão' }
  ];
}

/**
 * Obtém APIs de validação disponíveis
 */
export function getValidationAPIs() {
  return [
    { value: 'validate-cpf', label: 'Validar CPF' },
    { value: 'validate-cnpj', label: 'Validar CNPJ' },
    { value: 'validate-crm', label: 'Validar CRM' },
    { value: 'validate-nit', label: 'Validar NIT/PIS' }
  ];
}

/**
 * Obtém campos padrão para cada tipo de documento
 */
export function getDefaultFieldsForDocumentType(documentType: string): OCRFieldMapping[] {
  const defaults: Record<string, OCRFieldMapping[]> = {
    rg: [
      { ocrField: 'nome', required: true },
      { ocrField: 'rg', required: true },
      { ocrField: 'cpf', required: false },
      { ocrField: 'data_nascimento', required: false },
      { ocrField: 'orgao_emissor', required: false }
    ],
    cnh: [
      { ocrField: 'nome', required: true },
      { ocrField: 'cpf', required: true },
      { ocrField: 'numero_cnh', required: true },
      { ocrField: 'data_nascimento', required: false },
      { ocrField: 'categoria', required: false }
    ],
    cpf: [
      { ocrField: 'nome', required: true },
      { ocrField: 'cpf', required: true },
      { ocrField: 'data_nascimento', required: false }
    ],
    crm: [
      { ocrField: 'nome', required: true },
      { ocrField: 'crm', required: true },
      { ocrField: 'uf_crm', required: true },
      { ocrField: 'especialidades', required: false }
    ],
    cnpj: [
      { ocrField: 'razao_social', required: true },
      { ocrField: 'cnpj', required: true },
      { ocrField: 'endereco', required: false }
    ],
    comprovante_endereco: [
      { ocrField: 'logradouro', required: true },
      { ocrField: 'numero', required: false },
      { ocrField: 'bairro', required: false },
      { ocrField: 'cidade', required: true },
      { ocrField: 'estado', required: true },
      { ocrField: 'cep', required: true }
    ],
    diploma: [
      { ocrField: 'nome', required: true },
      { ocrField: 'curso', required: true },
      { ocrField: 'instituicao', required: true },
      { ocrField: 'data_conclusao', required: false }
    ],
    certidao: [
      { ocrField: 'nome', required: true },
      { ocrField: 'tipo_certidao', required: false },
      { ocrField: 'data_emissao', required: false }
    ]
  };

  return defaults[documentType] || [];
}
