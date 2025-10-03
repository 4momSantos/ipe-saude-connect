// Validation utilities for CPF, CNPJ, and CEP

export const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, "");
  
  if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) {
    return false;
  }

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

  return true;
};

export const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/\D/g, "");

  if (cleanCNPJ.length !== 14 || /^(\d)\1{13}$/.test(cleanCNPJ)) {
    return false;
  }

  let length = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, length);
  const digits = cleanCNPJ.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  length = length + 1;
  numbers = cleanCNPJ.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
};

export interface BrasilAPICepData {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  location: {
    type: string;
    coordinates: {
      longitude: string;
      latitude: string;
    };
  };
}

export interface BrasilAPICnpjData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  cep: string;
  uf: string;
  municipio: string;
  bairro: string;
  logradouro: string;
  numero: string;
  complemento: string;
  cnae_fiscal: number;
  cnae_fiscal_descricao: string;
  data_inicio_atividade: string;
  natureza_juridica: string;
  situacao_cadastral: number;
  descricao_situacao_cadastral: string;
  porte: string;
  qsa?: Array<{
    nome_socio: string;
    qualificacao_socio: string;
  }>;
}

export const validateCEP = async (cep: string): Promise<{ valid: boolean; data?: BrasilAPICepData }> => {
  const cleanCEP = cep.replace(/\D/g, "");
  
  if (cleanCEP.length !== 8) {
    return { valid: false };
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCEP}`);
    
    if (!response.ok) {
      return { valid: false };
    }
    
    const data: BrasilAPICepData = await response.json();
    
    return { valid: true, data };
  } catch (error) {
    return { valid: false };
  }
};

export const fetchCNPJData = async (cnpj: string): Promise<{ success: boolean; data?: BrasilAPICnpjData }> => {
  const cleanCNPJ = cnpj.replace(/\D/g, "");
  
  if (cleanCNPJ.length !== 14) {
    return { success: false };
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
    
    if (!response.ok) {
      return { success: false };
    }
    
    const data: BrasilAPICnpjData = await response.json();
    
    return { success: true, data };
  } catch (error) {
    return { success: false };
  }
};

export const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  return numbers
    .slice(0, 11)
    .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

export const formatCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  return numbers
    .slice(0, 14)
    .replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};

export const formatCEP = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  return numbers.slice(0, 8).replace(/(\d{5})(\d{3})/, "$1-$2");
};

export const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return numbers.slice(0, 11).replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
};

export interface CRMValidationData {
  nome: string;
  crm: string;
  uf: string;
  tipo_inscricao: string;
  situacao: string;
  especialidades: string[];
  ano_formatura: number;
  instituicao: string;
}

export const validateCRM = async (
  crm: string,
  uf: string
): Promise<{ valid: boolean; data?: CRMValidationData; message?: string }> => {
  const cleanCRM = crm.replace(/\D/g, "");
  
  if (!cleanCRM || !uf) {
    return { valid: false, message: "CRM e UF são obrigatórios" };
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-crm`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ inscricao: cleanCRM, uf }),
      }
    );

    if (!response.ok) {
      return { valid: false, message: "Erro ao validar CRM" };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Erro ao validar CRM:", error);
    return { valid: false, message: "Erro ao conectar com o serviço de validação" };
  }
};

export interface CPFValidationData {
  nome: string;
  cpf: string;
  data_nascimento: string;
  situacao_cadastral: string;
  data_inscricao: string;
}

export const validateCPFData = async (
  cpf: string,
  birthdate: string
): Promise<{ valid: boolean; data?: CPFValidationData; message?: string }> => {
  const cleanCPF = cpf.replace(/\D/g, "");
  
  if (!cleanCPF || !birthdate) {
    return { valid: false, message: "CPF e data de nascimento são obrigatórios" };
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-cpf`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ cpf: cleanCPF, birthdate }),
      }
    );

    if (!response.ok) {
      return { valid: false, message: "Erro ao validar CPF" };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Erro ao validar CPF:", error);
    return { valid: false, message: "Erro ao conectar com o serviço de validação" };
  }
};
