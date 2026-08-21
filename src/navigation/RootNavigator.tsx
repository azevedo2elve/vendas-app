import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useLicenseGuard } from '@/hooks/useLicenseGuard';
import { LoadingView } from '@/components/LoadingView';
import { LicenseBlockedScreen } from '@/screens/License/LicenseBlockedScreen';
import { HomeScreen } from '@/screens/HomeScreen';
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
