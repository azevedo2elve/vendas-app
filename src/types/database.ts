export type LicenseStatus = 'active' | 'expired' | 'blocked';

export type OrderStatus = 'pending' | 'completed' | 'cancelled';

export type PaymentMethod = 'dinheiro' | 'pix' | 'boleto' | 'cartao_credito' | 'cartao_debito' | 'a_prazo';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  boleto: 'Boleto',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  a_prazo: 'A Prazo',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};
