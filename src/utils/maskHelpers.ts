/**
 * Remove caracteres de formatação de máscaras
 */
export function cleanMask(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/\D/g, ''); // Remove tudo que não é dígito
}

/**
 * Valida CPF (11 dígitos)
 */
export function validateCPFMask(value: string | undefined): boolean {
  const cleaned = cleanMask(value);
  return cleaned.length === 11;
}

/**
 * Valida CNPJ (14 dígitos)
 */
export function validateCNPJMask(value: string | undefined): boolean {
  const cleaned = cleanMask(value);
  return cleaned.length === 14;
}

/**
 * Valida telefone (10 ou 11 dígitos)
 */
export function validatePhoneMask(value: string | undefined): boolean {
  const cleaned = cleanMask(value);
  return cleaned.length === 10 || cleaned.length === 11;
}

/**
 * Valida CEP (8 dígitos)
 */
export function validateCEPMask(value: string | undefined): boolean {
  const cleaned = cleanMask(value);
  return cleaned.length === 8;
}

/**
 * Valida RG (aceita formatos variados)
 */
export function validateRGMask(value: string | undefined): boolean {
  const cleaned = cleanMask(value);
  return cleaned.length >= 7 && cleaned.length <= 9;
}
