/// <reference types="jest" />
import { cartItemLineTotal, cartItemSubtotal, type CartItem } from '@/types/orderDraft';

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: 'p1',
    productName: 'Produto Teste',
    unitPrice: 1000, // R$10,00 em centavos
    quantity: 1,
    discountValue: 0,
    ...overrides,
  };
}

describe('cartItemLineTotal', () => {
  it('multiplica preço unitário pela quantidade, sem aplicar desconto', () => {
    expect(cartItemLineTotal(makeItem({ unitPrice: 1500, quantity: 3 }))).toBe(4500);
  });
});

describe('cartItemSubtotal', () => {
  it('subtrai o desconto do total da linha', () => {
    expect(cartItemSubtotal(makeItem({ unitPrice: 1000, quantity: 2, discountValue: 300 }))).toBe(1700);
  });

  it('nunca fica negativo, mesmo com desconto maior que o total da linha', () => {
    expect(cartItemSubtotal(makeItem({ unitPrice: 1000, quantity: 1, discountValue: 5000 }))).toBe(0);
  });

  it('sem desconto, o subtotal é igual ao total da linha', () => {
    const item = makeItem({ unitPrice: 750, quantity: 4 });
    expect(cartItemSubtotal(item)).toBe(cartItemLineTotal(item));
  });
});
