import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type LoadingViewProps = {
  message?: string;
};

export function LoadingView({ message = 'Carregando...' }: LoadingViewProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  message: {
    fontSize: 14,
    color: '#475569',
  },
});
