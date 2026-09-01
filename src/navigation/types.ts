export type RootStackParamList = {
  Home: undefined;
  ClientList: undefined;
  ClientForm: { clientId?: string } | undefined;
  ProductList: undefined;
  ProductForm: { productId?: string } | undefined;
  CategoryList: undefined;
  Backup: undefined;
  NewOrder: undefined;
  OrderList: undefined;
  OrderDetail: { orderId: string };
  Settings: undefined;
};

export type OrderDraftStackParamList = {
  OrderSelectClient: undefined;
  OrderItems: undefined;
  OrderReview: undefined;
  OrderSuccess: { orderId: string };
};
