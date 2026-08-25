import type { ComponentProps } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing } from '@/theme';

type FabProps = {
  onPress: () => void;
  accessibilityLabel: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
};

export function Fab({ onPress, accessibilityLabel, icon = 'add' }: FabProps) {
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={28} color={colors.white} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
});
