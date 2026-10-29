import {
  formatMonthName,
  formatMonthShort,
  formatMonthYear,
  getDayRange,
  getMonthRange,
  getNextMonth,
  getPreviousMonth,
  isSameMonth,
} from '../date';

describe('date utils', () => {
  describe('getDayRange', () => {
    it('cobre só o dia informado — data futura no mesmo mês fica de fora', () => {
      const range = getDayRange(new Date(2026, 9, 28, 15, 30));
      expect(range.start).toEqual(new Date(2026, 9, 28, 0, 0, 0, 0));
      expect(range.end).toEqual(new Date(2026, 9, 28, 23, 59, 59, 999));

      // Venda de 27/10 com recebimento em 30/10 não pode contar como "hoje" (28/10).
      const dueAt = new Date(2026, 9, 30).getTime();
      expect(dueAt >= range.startMs && dueAt <= range.endMs).toBe(false);
    });
  });

  describe('getMonthRange', () => {
    it('returns exact boundary for October 2026', () => {
      const range = getMonthRange(2026, 9);
      expect(range.start.getFullYear()).toBe(2026);
      expect(range.start.getMonth()).toBe(9);
      expect(range.start.getDate()).toBe(1);
      expect(range.start.getHours()).toBe(0);
      expect(range.start.getMinutes()).toBe(0);
      expect(range.start.getSeconds()).toBe(0);

      expect(range.end.getFullYear()).toBe(2026);
      expect(range.end.getMonth()).toBe(9);
      expect(range.end.getDate()).toBe(31);
      expect(range.end.getHours()).toBe(23);
      expect(range.end.getMinutes()).toBe(59);
      expect(range.end.getSeconds()).toBe(59);
      expect(range.end.getMilliseconds()).toBe(999);

      expect(range.startMs).toBe(range.start.getTime());
      expect(range.endMs).toBe(range.end.getTime());
    });

    it('correctly handles February in leap year (2024)', () => {
      const range = getMonthRange(2024, 1);
      expect(range.end.getDate()).toBe(29);
    });

    it('correctly handles February in non-leap year (2026)', () => {
      const range = getMonthRange(2026, 1);
      expect(range.end.getDate()).toBe(28);
    });
  });

  describe('formatMonthName', () => {
    it('formats capitalized month name in pt-BR', () => {
      expect(formatMonthName(0)).toBe('Janeiro');
      expect(formatMonthName(9)).toBe('Outubro');
      expect(formatMonthName(11)).toBe('Dezembro');
    });
  });

  describe('formatMonthYear', () => {
    it('formats month and year in pt-BR', () => {
      const formatted = formatMonthYear(2026, 9);
      expect(formatted).toMatch(/Outubro de 2026/i);
    });
  });

  describe('formatMonthShort', () => {
    it('formats short month name in pt-BR', () => {
      const short = formatMonthShort(9);
      expect(short.toLowerCase()).toContain('out');
    });
  });

  describe('isSameMonth', () => {
    it('returns true when dates are in the same month and year', () => {
      const d1 = new Date(2026, 9, 5);
      const d2 = new Date(2026, 9, 28);
      expect(isSameMonth(d1, d2)).toBe(true);
    });

    it('returns false when months or years differ', () => {
      const d1 = new Date(2026, 9, 5);
      const d2 = new Date(2026, 8, 5);
      const d3 = new Date(2025, 9, 5);
      expect(isSameMonth(d1, d2)).toBe(false);
      expect(isSameMonth(d1, d3)).toBe(false);
    });
  });

  describe('getPreviousMonth and getNextMonth', () => {
    it('handles normal transition', () => {
      expect(getPreviousMonth(2026, 5)).toEqual({ year: 2026, month: 4 });
      expect(getNextMonth(2026, 5)).toEqual({ year: 2026, month: 6 });
    });

    it('handles year rollback on January -> previous month', () => {
      expect(getPreviousMonth(2026, 0)).toEqual({ year: 2025, month: 11 });
    });

    it('handles year forward on December -> next month', () => {
      expect(getNextMonth(2026, 11)).toEqual({ year: 2027, month: 0 });
    });
  });
});
