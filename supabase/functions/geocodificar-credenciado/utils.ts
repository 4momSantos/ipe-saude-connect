/**
 * Normaliza endereços brasileiros para melhorar taxa de geocodificação
 */
export function normalizeAddressBrazil(address: string): string {
  return address
    // Remover múltiplos espaços
    .replace(/\s+/g, ' ')
    // Normalizar tipos de logradouro
    .replace(/\bR\.\s/gi, 'Rua ')
    .replace(/\bAv\.\s/gi, 'Avenida ')
    .replace(/\bTrav\.\s/gi, 'Travessa ')
    .replace(/\bPç\.\s/gi, 'Praça ')
    .replace(/\bAl\.\s/gi, 'Alameda ')
    // Adicionar "Brasil" ao final se não tiver país
    .concat(address.toLowerCase().includes('brasil') ? '' : ', Brasil')
    .trim();
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry com exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`[RETRY] Tentativa ${attempt + 1} falhou. Aguardando ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError!;
}
