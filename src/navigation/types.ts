export type RootStackParamList = {
  Home: undefined;
  ClientList: undefined;
  ClientForm: { clientId?: string } | undefined;
  ProductList: undefined;
  ProductForm: { productId?: string } | undefined;
  CategoryList: undefined;
  Backup: undefined;
  NewOrder: undefined;
  // `dayKind`: abre no filtro "Por dia" de hoje já com essa seleção (cards do Dashboard).
  OrderList: { year?: number; month?: number; dayKind?: 'sold' | 'receivable' } | undefined;
  OrderDetail: { orderId: string };
  OrderEdit: { orderId: string };
  Settings: undefined;
};

export type OrderDraftStackParamList = {
  OrderSelectClient: undefined;
  OrderItems: undefined;
  OrderReview: undefined;
  OrderSuccess: { orderId: string };
};
