import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme';

type LoadingViewProps = {
  message?: string;
};

export function LoadingView({ message = 'Carregando...' }: LoadingViewProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
