import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OrderDraftProvider } from '@/hooks/useOrderDraft';
import { OrderSelectClientScreen } from '@/screens/orders/OrderSelectClientScreen';
import { OrderItemsScreen } from '@/screens/orders/OrderItemsScreen';
import { OrderReviewScreen } from '@/screens/orders/OrderReviewScreen';
import { OrderSuccessScreen } from '@/screens/orders/OrderSuccessScreen';
import { colors } from '@/theme';
import type { OrderDraftStackParamList } from './types';

const Stack = createNativeStackNavigator<OrderDraftStackParamList>();

export function OrderDraftNavigator() {
  return (
    <OrderDraftProvider>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="OrderSelectClient" component={OrderSelectClientScreen} options={{ title: 'Nova venda' }} />
        <Stack.Screen name="OrderItems" component={OrderItemsScreen} options={{ title: 'Adicionar itens' }} />
        <Stack.Screen name="OrderReview" component={OrderReviewScreen} options={{ title: 'Fechamento' }} />
        <Stack.Screen
          name="OrderSuccess"
          component={OrderSuccessScreen}
          options={{ title: '', headerBackVisible: false, gestureEnabled: false }}
        />
      </Stack.Navigator>
    </OrderDraftProvider>
  );
}
