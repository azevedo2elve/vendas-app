import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OrderDraftProvider } from '@/hooks/useOrderDraft';
import { OrderSelectClientScreen } from '@/screens/orders/OrderSelectClientScreen';
import { OrderItemsScreen } from '@/screens/orders/OrderItemsScreen';
import { OrderReviewScreen } from '@/screens/orders/OrderReviewScreen';
import type { OrderDraftStackParamList } from './types';

const Stack = createNativeStackNavigator<OrderDraftStackParamList>();

export function OrderDraftNavigator() {
  return (
    <OrderDraftProvider>
      <Stack.Navigator>
        <Stack.Screen name="OrderSelectClient" component={OrderSelectClientScreen} options={{ title: '1. Cliente' }} />
        <Stack.Screen name="OrderItems" component={OrderItemsScreen} options={{ title: '2. Itens' }} />
        <Stack.Screen name="OrderReview" component={OrderReviewScreen} options={{ title: '3. Fechamento' }} />
      </Stack.Navigator>
    </OrderDraftProvider>
  );
}
