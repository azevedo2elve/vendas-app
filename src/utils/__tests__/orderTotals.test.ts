import { getDayRange } from '../date';
import { isReceivableInRange, isSoldInRange, sumTotalNet, type OrderDatesLike } from '../orderTotals';

// Cenário real do cliente (backup de 2026-10-28), horários de Brasília.
const at = (day: number, month: number, hour = 12) => new Date(2026, month - 1, day, hour, 0);
const order = (createdAt: Date, paymentDueAt: Date | null, totalNet: number): OrderDatesLike => ({
  createdAt,
  paymentDueAt,
  totalNet,
});

const prazo27para30 = order(at(27, 10, 16), at(30, 10, 0), 121433);
const prazo28para02 = order(at(28, 10, 8), at(2, 11, 0), 59743);
const aVista28 = order(at(28, 10, 10), null, 10000);
const aVista27 = order(at(27, 10, 18), null, 5000);
const all = [prazo27para30, prazo28para02, aVista28, aVista27];

const dia = (day: number, month: number) => getDayRange(at(day, month));
const soldOn = (day: number, month: number) => sumTotalNet(all.filter((o) => isSoldInRange(o, dia(day, month))));
const receivableOn = (day: number, month: number) =>
  sumTotalNet(all.filter((o) => isReceivableInRange(o, dia(day, month))));

describe('orderTotals', () => {
  it('"Vendido" conta no dia da emissão, com qualquer prazo', () => {
    expect(soldOn(28, 10)).toBe(59743 + 10000);
    expect(soldOn(27, 10)).toBe(121433 + 5000);
  });

  it('"A receber" conta no dia do recebimento, ou no da emissão quando é à vista', () => {
    expect(receivableOn(28, 10)).toBe(10000);
    expect(receivableOn(27, 10)).toBe(5000);
    expect(receivableOn(30, 10)).toBe(121433);
    expect(receivableOn(2, 11)).toBe(59743);
  });

  // Regressão do bug de 2026-10-28: venda de ontem com recebimento futuro não pode cair em
  // "hoje" — o filtro antigo só tinha o limite inferior do dia.
  it('venda de 27/10 com recebimento em 30/10 não conta como a receber em 28/10 nem 29/10', () => {
    expect(isReceivableInRange(prazo27para30, dia(28, 10))).toBe(false);
    expect(isReceivableInRange(prazo27para30, dia(29, 10))).toBe(false);
  });

  it('limites do dia são inclusivos (00:00:00.000 e 23:59:59.999)', () => {
    const range = dia(28, 10);
    expect(isSoldInRange(order(new Date(range.startMs), null, 1), range)).toBe(true);
    expect(isSoldInRange(order(new Date(range.endMs), null, 1), range)).toBe(true);
    expect(isSoldInRange(order(new Date(range.endMs + 1), null, 1), range)).toBe(false);
  });
});
