// Cache de RegExp compilados para performance
const regexCache = new Map<string, RegExp>();

/**
 * Obtém regex do cache ou compila se necessário
 */
export function getCachedRegex(pattern: string, flags: string = 'i'): RegExp {
  const key = `${pattern}::${flags}`;
  if (!regexCache.has(key)) {
    regexCache.set(key, new RegExp(pattern, flags));
  }
  return regexCache.get(key)!;
}

// Padrões reutilizáveis para documentos brasileiros
export const PATTERNS = {
  // Documentos de identificação
  CPF: /(\d{3}\.?\d{3}\.?\d{3}[\-\.]?\d{2})/,
  CNPJ: /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}[\-\.]?\d{2})/,
  RG: /(\d{1,2}\.?\d{3}\.?\d{3}[\-\.]?[\dXx])/,
  CNH: /(\d{11})/,
  CRM: /(CRM[\s\-\/]*[A-Z]{2}[\s\-\/]*\d{4,6})/i,
  
  // Datas
  DATE_DDMMYYYY: /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/,
  DATE_EXTENSO: /(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/i,
  DATE_ABREV: /(\d{1,2})[\/\-\s](jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*[\/\-\s](\d{4})/i,
  
  // Endereços
  CEP: /(\d{5}[\-\.]?\d{3})/,
  ESTADO_UF: /\b([A-Z]{2})\b/,
  
  // Nomes
  NOME_COMPLETO: /\b([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+(?:\s+(?:d[aeo]s?|e|da)\s+)?(?:[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+\s*){1,})\b/,
  NOME_MAIUSCULAS: /\b([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+){1,})\b/,
  
  // Dados de registro
  LIVRO: /LIVRO[:\s]*([A-Z0-9\-]+)/i,
  FOLHA: /(?:FOLHA|FLS|FL)[:\s]*(\d+[A-Za-z]?)/i,
  TERMO: /TERMO[:\s]*(\d+)/i,
  
  // Outros
  EMAIL: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
  TELEFONE: /(\(?\d{2}\)?\s?\d{4,5}[\-\s]?\d{4})/,
};

/**
 * Valida CPF
 */
export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.length === 11 && !/^(\d)\1{10}$/.test(cleaned);
}

/**
 * Valida CNPJ
 */
export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned.length === 14 && !/^(\d)\1{13}$/.test(cleaned);
}

/**
 * Valida CEP
 */
export function isValidCEP(cep: string): boolean {
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.length === 8;
}

/**
 * Valida UF brasileira
 */
export function isValidUF(uf: string): boolean {
  const ufs = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];
  return ufs.includes(uf.toUpperCase());
}
