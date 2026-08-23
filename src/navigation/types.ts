export type RootStackParamList = {
  Home: undefined;
  ClientList: undefined;
  ClientForm: { clientId?: string } | undefined;
  ProductList: undefined;
  ProductForm: { productId?: string } | undefined;
  Backup: undefined;
  NewOrder: undefined;
  OrderList: undefined;
  OrderDetail: { orderId: string };
};

export type OrderDraftStackParamList = {
  OrderSelectClient: undefined;
  OrderItems: undefined;
  OrderReview: undefined;
};
