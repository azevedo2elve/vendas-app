/**
 * Regras de "em qual dia uma venda conta", compartilhadas entre o Dashboard e a listagem de ordens.
 * Tipo estrutural (não o model `Order`) para testar sem WatermelonDB.
 */

export type OrderDatesLike = {
  createdAt: Date;
  paymentDueAt: Date | null;
  totalNet: number;
};

export type TimeRange = { startMs: number; endMs: number };

function inRange(date: Date, { startMs, endMs }: TimeRange): boolean {
  const ms = date.getTime();
  return ms >= startMs && ms <= endMs;
}

/** "Vendido": o pedido foi emitido dentro do intervalo, qualquer que seja o prazo de recebimento. */
export function isSoldInRange(order: OrderDatesLike, range: TimeRange): boolean {
  return inRange(order.createdAt, range);
}

/**
 * "A receber": recebimento previsto dentro do intervalo — ou, sem data de recebimento (à vista),
 * emitido dentro do intervalo. Mesmo critério de `Order.referenceDate`.
 */
export function isReceivableInRange(order: OrderDatesLike, range: TimeRange): boolean {
  return inRange(order.paymentDueAt ?? order.createdAt, range);
}

export function sumTotalNet(orders: OrderDatesLike[]): number {
  return orders.reduce((acc, order) => acc + order.totalNet, 0);
}
