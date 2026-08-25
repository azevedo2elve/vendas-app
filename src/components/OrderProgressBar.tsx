import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';

const STEPS = ['Cliente', 'Itens', 'Fechamento'] as const;

type OrderProgressBarProps = {
  step: 1 | 2 | 3;
};

export function OrderProgressBar({ step }: OrderProgressBarProps) {
  return (
    <View style={styles.container}>
      {STEPS.map((label, index) => {
        const stepNumber = index + 1;
        const isDone = stepNumber < step;
        const isCurrent = stepNumber === step;

        return (
          <View key={label} style={styles.stepWrap}>
            <View style={styles.stepRow}>
              <View
                style={[
                  styles.circle,
                  isCurrent ? styles.circleCurrent : null,
                  isDone ? styles.circleDone : null,
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                ) : (
                  <Text style={[styles.circleText, isCurrent ? styles.circleTextCurrent : null]}>
                    {stepNumber}
                  </Text>
                )}
              </View>
              {stepNumber < STEPS.length ? (
                <View style={[styles.line, isDone ? styles.lineDone : null]} />
              ) : null}
            </View>
            <Text style={[styles.label, isCurrent ? styles.labelCurrent : null]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepWrap: {
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  circleCurrent: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  circleDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  circleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate500,
  },
  circleTextCurrent: {
    color: colors.white,
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  lineDone: {
    backgroundColor: colors.success,
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  labelCurrent: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
