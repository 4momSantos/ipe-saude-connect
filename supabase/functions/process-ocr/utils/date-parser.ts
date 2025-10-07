const MESES_EXTENSO: Record<string, string> = {
  'janeiro': '01', 'jan': '01',
  'fevereiro': '02', 'fev': '02',
  'marco': '03', 'mar': '03', 'março': '03',
  'abril': '04', 'abr': '04',
  'maio': '05', 'mai': '05',
  'junho': '06', 'jun': '06',
  'julho': '07', 'jul': '07',
  'agosto': '08', 'ago': '08',
  'setembro': '09', 'set': '09',
  'outubro': '10', 'out': '10',
  'novembro': '11', 'nov': '11',
  'dezembro': '12', 'dez': '12'
};

/**
 * Extrai data em vários formatos e retorna DD/MM/YYYY
 */
export function extractDate(text: string): string | null {
  // Formato DD/MM/YYYY ou DD-MM-YYYY
  let match = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (match) {
    const [, dia, mes, ano] = match;
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
  }

  // Formato por extenso: "20 de dezembro de 2024"
  match = text.match(/(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/i);
  if (match) {
    const [, dia, mes, ano] = match;
    const mesNum = MESES_EXTENSO[mes.toLowerCase()];
    if (mesNum) {
      return `${dia.padStart(2, '0')}/${mesNum}/${ano}`;
    }
  }

  // Formato abreviado: "20/DEZ/2024"
  match = text.match(/(\d{1,2})[\/\-\s](jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*[\/\-\s](\d{4})/i);
  if (match) {
    const [, dia, mes, ano] = match;
    const mesNum = MESES_EXTENSO[mes.toLowerCase()];
    if (mesNum) {
      return `${dia.padStart(2, '0')}/${mesNum}/${ano}`;
    }
  }

  // Formato YYYYMMDD
  match = text.match(/(\d{4})(\d{2})(\d{2})/);
  if (match) {
    const [, ano, mes, dia] = match;
    if (validateDateRange(`${dia}/${mes}/${ano}`)) {
      return `${dia}/${mes}/${ano}`;
    }
  }

  return null;
}

/**
 * Valida se a data está em um range razoável
 */
export function validateDateRange(dateStr: string, minYear: number = 1900, maxYear: number = 2030): boolean {
  const match = dateStr.match(/\d{1,2}\/\d{1,2}\/(\d{4})/);
  if (!match) return false;
  
  const year = parseInt(match[1]);
  return year >= minYear && year <= maxYear;
}

/**
 * Normaliza vários formatos de data para DD/MM/YYYY
 */
export function normalizeDateFormat(dateStr: string): string {
  const extracted = extractDate(dateStr);
  return extracted || dateStr;
}

/**
 * Extrai múltiplas datas de um texto
 */
export function extractAllDates(text: string): string[] {
  const dates: string[] = [];
  
  // Regex para DD/MM/YYYY
  const matches = text.matchAll(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g);
  for (const match of matches) {
    const [, dia, mes, ano] = match;
    const dateStr = `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
    if (validateDateRange(dateStr)) {
      dates.push(dateStr);
    }
  }
  
  return dates;
}
