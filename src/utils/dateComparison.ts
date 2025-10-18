/**
 * Utilities for safe date comparison and manipulation
 * Handles timezone issues when comparing dates
 */

/**
 * Compara duas datas ignorando horário, fuso horário e timezone
 * Compara apenas: ano, mês e dia
 */
export function isSameDateIgnoringTime(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? new Date(date1 + 'T12:00:00') : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2 + 'T12:00:00') : date2;
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Converte string YYYY-MM-DD para Date sem problemas de timezone
 * Adiciona T12:00:00 para garantir que a data não mude de dia
 */
export function parseISODateSafe(dateString: string): Date {
  // Adicionar horário meio-dia para evitar problemas de timezone
  return new Date(dateString + 'T12:00:00');
}

/**
 * Calcula idade em anos considerando apenas dia, mês e ano
 */
export function calculateAge(birthdate: Date | string): number {
  const birth = typeof birthdate === 'string' 
    ? parseISODateSafe(birthdate) 
    : birthdate;
  const today = new Date();
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}
