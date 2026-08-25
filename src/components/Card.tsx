import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing } from '@/theme';

type CardProps = ViewProps & {
  elevated?: boolean;
  padded?: boolean;
  style?: ViewStyle | ViewStyle[];
};

export function Card({ elevated, padded = true, style, children, ...rest }: CardProps) {
  return (
    <View
      style={[styles.card, padded ? styles.padded : null, elevated ? shadows.card : null, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: {
    padding: spacing.md,
  },
});
