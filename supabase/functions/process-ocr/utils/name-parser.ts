/**
 * Extrai nome completo de texto usando padrões brasileiros
 */
export function extractName(text: string, minLength: number = 10, maxLength: number = 60): string | null {
  // Padrão: Nome com pelo menos duas palavras, cada uma começando com maiúscula
  const namePattern = /\b([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+(?:\s+(?:d[aeo]s?|e|da)\s+)?(?:[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+\s*){1,})\b/;
  
  const match = text.match(namePattern);
  if (match) {
    const name = match[1].trim();
    if (name.length >= minLength && name.length <= maxLength) {
      return cleanName(name);
    }
  }
  
  return null;
}

/**
 * Limpa nome removendo títulos e caracteres especiais
 */
export function cleanName(name: string): string {
  // Remove títulos comuns
  const titulesToRemove = ['DR', 'DRA', 'SR', 'SRA', 'PROF', 'ENG', 'ARQ'];
  let cleaned = name;
  
  for (const titulo of titulesToRemove) {
    const regex = new RegExp(`\\b${titulo}\\.?\\s+`, 'gi');
    cleaned = cleaned.replace(regex, '');
  }
  
  // Remove caracteres especiais mas mantém acentos
  cleaned = cleaned.replace(/[^a-záàâãéèêíïóôõöúçñ\s]/gi, '').trim();
  
  // Remove espaços múltiplos
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  return cleaned;
}

/**
 * Separa primeiro nome e sobrenome
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  
  // Primeiro nome é a primeira parte
  const firstName = parts[0];
  
  // Sobrenome é o resto
  const lastName = parts.slice(1).join(' ');
  
  return { firstName, lastName };
}

/**
 * Valida se um nome parece ser um nome brasileiro válido
 */
export function validateName(name: string): boolean {
  // Deve ter pelo menos 2 palavras
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return false;
  
  // Cada palavra deve ter pelo menos 2 caracteres
  if (words.some(word => word.length < 2)) return false;
  
  // Não deve conter números
  if (/\d/.test(name)) return false;
  
  return true;
}

/**
 * Extrai nome em MAIÚSCULAS de um texto
 */
export function extractUppercaseName(text: string): string | null {
  // Procura sequência de palavras em MAIÚSCULAS
  const match = text.match(/\b([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+){1,})\b/);
  if (match) {
    const name = match[1].trim();
    if (name.length >= 10 && name.length <= 60 && validateName(name)) {
      return name;
    }
  }
  return null;
}
