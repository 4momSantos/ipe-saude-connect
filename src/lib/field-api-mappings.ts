// Mappings between API field types and their auto-fill capabilities

export interface FieldAutoFillMapping {
  sourceType: string;
  canFillTypes: string[];
  fillMapping: Record<string, string>; // source field -> target field type
}

export const apiFieldMappings: Record<string, FieldAutoFillMapping> = {
  cpf: {
    sourceType: 'cpf',
    canFillTypes: ['text', 'date'],
    fillMapping: {
      nome: 'text',
      data_nascimento: 'date',
      situacao: 'text',
    }
  },
  cnpj: {
    sourceType: 'cnpj',
    canFillTypes: ['text', 'cep'],
    fillMapping: {
      razao_social: 'text',
      logradouro: 'text',
      numero: 'text',
      complemento: 'text',
      bairro: 'text',
      cidade: 'text',
      estado: 'text',
      cep: 'cep',
      situacao_cadastral: 'text',
    }
  },
  crm: {
    sourceType: 'crm',
    canFillTypes: ['text', 'number', 'select'],
    fillMapping: {
      especialidades: 'select',
      instituicao_graduacao: 'text',
      ano_formatura: 'number',
    }
  },
  cep: {
    sourceType: 'cep',
    canFillTypes: ['text'],
    fillMapping: {
      logradouro: 'text',
      bairro: 'text',
      cidade: 'text',
      estado: 'text',
    }
  },
  nit: {
    sourceType: 'nit',
    canFillTypes: ['text', 'date'],
    fillMapping: {
      nit: 'text',
      cpf: 'cpf',
      nome: 'text',
      data_nascimento: 'date',
    }
  }
};

export function getAutoFillableFields(sourceFieldType: string): string[] {
  const mapping = apiFieldMappings[sourceFieldType];
  return mapping ? Object.keys(mapping.fillMapping) : [];
}

export function canAutoFill(sourceType: string, targetType: string): boolean {
  const mapping = apiFieldMappings[sourceType];
  return mapping ? mapping.canFillTypes.includes(targetType) : false;
}
