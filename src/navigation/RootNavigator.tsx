import { useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useLicenseGuard } from '@/hooks/useLicenseGuard';
import { LicenseAccessProvider } from '@/hooks/useLicenseAccess';
import { LoadingView } from '@/components/LoadingView';
import { ReadOnlyBanner } from '@/components/ReadOnlyBanner';
import { LicenseExpiryBanner } from '@/components/LicenseExpiryBanner';
import { LicenseBlockedScreen } from '@/screens/License/LicenseBlockedScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { ClientListScreen } from '@/screens/clients/ClientListScreen';
import { ClientFormScreen } from '@/screens/clients/ClientFormScreen';
import { ProductListScreen } from '@/screens/products/ProductListScreen';
import { ProductFormScreen } from '@/screens/products/ProductFormScreen';
import { CategoryListScreen } from '@/screens/products/CategoryListScreen';
import { BackupScreen } from '@/screens/backup/BackupScreen';
import { OrderListScreen } from '@/screens/orders/OrderListScreen';
import { OrderDetailScreen } from '@/screens/orders/OrderDetailScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { OrderDraftNavigator } from './OrderDraftNavigator';
import { colors } from '@/theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { checking, status, reason, deviceId, expiresAt, retry } = useLicenseGuard();
  const [retrying, setRetrying] = useState(false);

  if (checking || status === null) {
    return <LoadingView message="Verificando licença..." />;
  }

  // `blocked` bloqueia o app inteiro (revogação manual, relógio adulterado ou dispositivo não
  // cadastrado) — a única exceção é o próprio botão de exportar backup embutido nessa tela.
  if (status === 'blocked') {
    return <LicenseBlockedScreen status={status} reason={reason} deviceId={deviceId} onRetry={retry} />;
  }

  // `expired` (licença vencida, sem internet pra renovar) libera o app em modo somente-leitura,
  // em vez de bloquear tudo — ver tabela de regras em docs/04-sistema-licenca.md.
  const readOnly = status === 'expired';

  async function handleRetry() {
    setRetrying(true);
    try {
      await retry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <LicenseAccessProvider readOnly={readOnly} expiresAt={expiresAt}>
      <View style={{ flex: 1 }}>
        {readOnly ? <ReadOnlyBanner onRetry={handleRetry} retrying={retrying} /> : null}
        {!readOnly && expiresAt ? (
          <LicenseExpiryBanner expiresAt={expiresAt} onValidateNow={handleRetry} validating={retrying} />
        ) : null}
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.textPrimary,
              headerTitleStyle: { fontWeight: '700', color: colors.textPrimary },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ClientList" component={ClientListScreen} options={{ title: 'Clientes' }} />
            <Stack.Screen name="ClientForm" component={ClientFormScreen} options={{ title: 'Cliente' }} />
            <Stack.Screen name="ProductList" component={ProductListScreen} options={{ title: 'Produtos' }} />
            <Stack.Screen name="ProductForm" component={ProductFormScreen} options={{ title: 'Produto' }} />
            <Stack.Screen name="CategoryList" component={CategoryListScreen} options={{ title: 'Categorias' }} />
            <Stack.Screen name="Backup" component={BackupScreen} options={{ title: 'Backup' }} />
            <Stack.Screen name="OrderList" component={OrderListScreen} options={{ title: 'Ordens de Venda' }} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Pedido' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Configurações' }} />
            <Stack.Screen name="NewOrder" component={OrderDraftNavigator} options={{ headerShown: false }} />
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </LicenseAccessProvider>
  );
}
