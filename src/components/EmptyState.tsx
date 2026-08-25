import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '@/theme';

type EmptyStateProps = {
  title: string;
  message?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
};

export function EmptyState({ title, message, icon = 'file-tray-outline' }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={36} color={colors.slate400} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: 72,
    gap: spacing.xs,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: radii.pill,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.slate700,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
});
