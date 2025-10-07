/**
 * Normaliza texto removendo caracteres especiais e múltiplos espaços
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, ' ') // Remove pontuação
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim()
    .toUpperCase();
}

/**
 * Remove acentos mantendo estrutura do texto
 */
export function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Converte para maiúsculas preservando quebras de linha
 */
export function uppercasePreserveStructure(text: string): string {
  return text.toUpperCase();
}

/**
 * Limpa texto removendo caracteres de controle
 */
export function cleanText(text: string): string {
  return text.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
}

/**
 * Extrai texto entre dois marcadores
 */
export function extractBetween(text: string, start: string, end: string): string | null {
  const regex = new RegExp(`${start}([\\s\\S]*?)${end}`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}
