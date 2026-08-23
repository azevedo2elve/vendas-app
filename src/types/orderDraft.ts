export type CartItem = {
  productId: string;
  /** Snapshot do nome no momento em que o item foi adicionado ao carrinho. */
  productName: string;
  /** Snapshot do preço unitário (centavos) no momento em que o item foi adicionado. */
  unitPrice: number;
  quantity: number;
  /** Desconto do item, em centavos. */
  discountValue: number;
};

export function cartItemLineTotal(item: CartItem): number {
  return item.unitPrice * item.quantity;
}

export function cartItemSubtotal(item: CartItem): number {
  return Math.max(0, cartItemLineTotal(item) - item.discountValue);
}
