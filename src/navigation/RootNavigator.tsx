import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useLicenseGuard } from '@/hooks/useLicenseGuard';
import { LoadingView } from '@/components/LoadingView';
import { LicenseBlockedScreen } from '@/screens/License/LicenseBlockedScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { ClientListScreen } from '@/screens/clients/ClientListScreen';
import { ClientFormScreen } from '@/screens/clients/ClientFormScreen';
import { ProductListScreen } from '@/screens/products/ProductListScreen';
import { ProductFormScreen } from '@/screens/products/ProductFormScreen';
import { BackupScreen } from '@/screens/backup/BackupScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { checking, status, reason, deviceId, retry } = useLicenseGuard();

  if (checking || status === null) {
    return <LoadingView message="Verificando licença..." />;
  }

  if (status !== 'active') {
    return <LicenseBlockedScreen status={status} reason={reason} deviceId={deviceId} onRetry={retry} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Início' }} />
        <Stack.Screen name="ClientList" component={ClientListScreen} options={{ title: 'Clientes' }} />
        <Stack.Screen name="ClientForm" component={ClientFormScreen} options={{ title: 'Cliente' }} />
        <Stack.Screen name="ProductList" component={ProductListScreen} options={{ title: 'Produtos' }} />
        <Stack.Screen name="ProductForm" component={ProductFormScreen} options={{ title: 'Produto' }} />
        <Stack.Screen name="Backup" component={BackupScreen} options={{ title: 'Backup' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
