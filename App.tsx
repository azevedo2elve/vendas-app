import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '@/navigation/RootNavigator';
import { ToastProvider } from '@/components/Toast';

export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <RootNavigator />
        <StatusBar style="dark" />
      </ToastProvider>
    </SafeAreaProvider>
  );
}
