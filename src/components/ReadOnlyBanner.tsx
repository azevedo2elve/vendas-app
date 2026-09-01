import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

type ReadOnlyBannerProps = {
  onRetry: () => void;
  retrying: boolean;
};

// Fica acima do NavigationContainer (não dentro de uma tela) para aparecer em qualquer lugar do
// app enquanto a licença estiver `expired` — ver RootNavigator.tsx.
export function ReadOnlyBanner({ onRetry, retrying }: ReadOnlyBannerProps) {
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      style={[styles.banner, { paddingTop: insets.top + spacing.xs }]}
      onPress={onRetry}
      disabled={retrying}
      activeOpacity={0.8}
    >
      <Ionicons name="cloud-offline-outline" size={16} color={colors.warningStrong} />
      <Text style={styles.text} numberOfLines={2}>
        Licença expirada — modo somente leitura. Toque para tentar renovar.
      </Text>
      {retrying ? <ActivityIndicator size="small" color={colors.warningStrong} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningBg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.warningStrong,
  },
});
