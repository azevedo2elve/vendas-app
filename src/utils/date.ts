/**
 * Utilitários para cálculo de períodos, intervalos de meses e formatação de datas.
 */

export type MonthRange = {
  startMs: number;
  endMs: number;
  start: Date;
  end: Date;
};

/**
 * Retorna o intervalo exato (em Date e timestamps ms) de um mês específico (0-indexed).
 * Ex: getMonthRange(2026, 9) -> início 01/10/2026 00:00:00.000 até 31/10/2026 23:59:59.999.
 */
export function getMonthRange(year: number, month: number): MonthRange {
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return {
    start,
    end,
    startMs: start.getTime(),
    endMs: end.getTime(),
  };
}

/**
 * Retorna o nome por extenso do mês capitalizado (ex: "Outubro", "Janeiro").
 */
export function formatMonthName(month: number, locale = 'pt-BR'): string {
  const date = new Date(2026, month, 15);
  const name = date.toLocaleDateString(locale, { month: 'long' });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Retorna o mês e ano formatados (ex: "Outubro de 2026").
 */
export function formatMonthYear(year: number, month: number, locale = 'pt-BR'): string {
  const date = new Date(year, month, 15);
  const raw = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Retorna o nome abreviado do mês capitalizado (ex: "Out.", "Jan.").
 */
export function formatMonthShort(month: number, locale = 'pt-BR'): string {
  const date = new Date(2026, month, 15);
  const name = date.toLocaleDateString(locale, { month: 'short' });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Verifica se duas datas caem no mesmo mês e ano.
 */
export function isSameMonth(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}

/**
 * Retorna o ano e mês anteriores, tratando virada de ano (Janeiro -> Dezembro do ano anterior).
 */
export function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 0) {
    return { year: year - 1, month: 11 };
  }
  return { year, month: month - 1 };
}

/**
 * Retorna o ano e mês seguintes, tratando virada de ano (Dezembro -> Janeiro do ano seguinte).
 */
export function getNextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 11) {
    return { year: year + 1, month: 0 };
  }
  return { year, month: month + 1 };
}
