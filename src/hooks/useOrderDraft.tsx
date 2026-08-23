import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import Product from '@/database/models/Product';
import { cartItemSubtotal, cartItemLineTotal, type CartItem } from '@/types/orderDraft';

type OrderDraftTotals = {
  itemCount: number;
  quantityTotal: number;
  subtotal: number;
  itemsDiscountTotal: number;
  totalGross: number;
};

type OrderDraftContextValue = {
  clientId: string | null;
  clientName: string | null;
  items: CartItem[];
  totals: OrderDraftTotals;
  setClient: (id: string, name: string) => void;
  addProduct: (product: Product) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, discountValue: number) => void;
  removeItem: (productId: string) => void;
  reset: () => void;
};

const OrderDraftContext = createContext<OrderDraftContextValue | null>(null);

export function OrderDraftProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);

  const setClient = useCallback((id: string, name: string) => {
    setClientId(id);
    setClientName(name);
  }, []);

  const addProduct = useCallback((product: Product) => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...current,
        { productId: product.id, productName: product.name, unitPrice: product.price, quantity: 1, discountValue: 0 },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) =>
      current.map((item) => (item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item))
    );
  }, []);

  const updateDiscount = useCallback((productId: string, discountValue: number) => {
    setItems((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, discountValue: Math.max(0, discountValue) } : item
      )
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }, []);

  const reset = useCallback(() => {
    setClientId(null);
    setClientName(null);
    setItems([]);
  }, []);

  const totals = useMemo<OrderDraftTotals>(() => {
    const subtotal = items.reduce((acc, item) => acc + cartItemLineTotal(item), 0);
    const itemsDiscountTotal = items.reduce((acc, item) => acc + item.discountValue, 0);
    return {
      itemCount: items.length,
      quantityTotal: items.reduce((acc, item) => acc + item.quantity, 0),
      subtotal,
      itemsDiscountTotal,
      totalGross: items.reduce((acc, item) => acc + cartItemSubtotal(item), 0),
    };
  }, [items]);

  const value: OrderDraftContextValue = {
    clientId,
    clientName,
    items,
    totals,
    setClient,
    addProduct,
    updateQuantity,
    updateDiscount,
    removeItem,
    reset,
  };

  return <OrderDraftContext.Provider value={value}>{children}</OrderDraftContext.Provider>;
}

export function useOrderDraft(): OrderDraftContextValue {
  const context = useContext(OrderDraftContext);
  if (!context) {
    throw new Error('useOrderDraft must be used within an OrderDraftProvider');
  }
  return context;
}
