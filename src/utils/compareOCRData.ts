export interface Discrepancia {
  campo: string;
  esperado: any;
  encontrado: any;
  severidade: 'critica' | 'moderada' | 'baixa';
  similaridade: number;
  normalizado: {
    esperado: string;
    encontrado: string;
  };
}

/**
 * Compara dados extraídos por OCR com dados preenchidos na inscrição
 */
export function compararOCRcomDados(
  ocrResultado: Record<string, any>,
  dadosPreenchidos: Record<string, any>,
  camposMapeamento: Array<{ ocrField: string; contextField: string }>
): Discrepancia[] {
  const discrepancias: Discrepancia[] = [];

  for (const mapping of camposMapeamento) {
    const valorOCR = ocrResultado[mapping.ocrField];
    const valorInscricao = getNestedValue(dadosPreenchidos, mapping.contextField);

    if (!valorOCR || !valorInscricao) continue;

    const resultado = verificarDiscrepancia(valorInscricao, valorOCR);

    if (resultado) {
      discrepancias.push({
        campo: mapping.ocrField,
        esperado: valorInscricao,
        encontrado: valorOCR,
        severidade: resultado.severidade,
        similaridade: resultado.similaridade,
        normalizado: {
          esperado: normalize(valorInscricao),
          encontrado: normalize(valorOCR)
        }
      });
    }
  }

  return discrepancias;
}

/**
 * Calcula similaridade entre duas strings usando algoritmo de Levenshtein
 * Retorna score de 0 a 100 (100 = idêntico)
 */
export function calcularSimilaridadeLevenshtein(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (longer.length === 0) return 100;

  const editDistance = levenshtein(longer, shorter);
  return ((longer.length - editDistance) / longer.length) * 100;
}

/**
 * Normaliza string removendo acentos, pontuação e espaços extras
 */
export function normalize(val: any): string {
  return String(val)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
}

/**
 * Verifica se há discrepância entre dois valores
 */
function verificarDiscrepancia(
  valorInscricao: any,
  valorOCR: any
): { severidade: 'critica' | 'moderada' | 'baixa'; similaridade: number } | null {
  if (!valorOCR || !valorInscricao) return null;

  const inscricaoNorm = normalize(valorInscricao);
  const ocrNorm = normalize(valorOCR);

  if (inscricaoNorm === ocrNorm) return null;

  // Calcular similaridade
  const similaridade = calcularSimilaridadeLevenshtein(inscricaoNorm, ocrNorm);

  return {
    severidade: similaridade > 80 ? 'baixa' : similaridade > 60 ? 'moderada' : 'critica',
    similaridade
  };
}

/**
 * Obtém valor de objeto aninhado usando dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Implementação do algoritmo de Levenshtein (distância de edição)
 */
function levenshtein(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substituição
          matrix[i][j - 1] + 1,     // inserção
          matrix[i - 1][j] + 1      // deleção
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
