import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaskedInput } from './MaskedInput';
import { colors, radii, spacing } from '@/theme';

type DiscountMode = 'amount' | 'percent';

type DiscountInputProps = {
  label?: string;
  /** Valor (em centavos) sobre o qual o modo percentual é calculado. */
  baseAmount: number;
  /** Desconto atual, sempre em centavos — o modo (R$/%) é só uma conveniência de digitação. */
  valueCents: number;
  onChange: (cents: number) => void;
  /** Modo compacto para exibição dentro de cards de itens/carrinho. */
  compact?: boolean;
};

function formatPercentFromCents(cents: number, base: number): string {
  if (base <= 0) return '0';
  const percent = (cents / base) * 100;
  return percent === 0 ? '0' : String(Math.round(percent * 100) / 100);
}

export function DiscountInput({
  label = 'Desconto',
  baseAmount,
  valueCents,
  onChange,
  compact = false,
}: DiscountInputProps) {
  const [mode, setMode] = useState<DiscountMode>('amount');
  const [percentText, setPercentText] = useState(() => formatPercentFromCents(valueCents, baseAmount));

  function handleAmountChange(cents: string) {
    const raw = Number(cents) || 0;
    const clamped = Math.max(0, Math.min(raw, baseAmount));
    onChange(clamped);
  }

  function handlePercentChange(text: string) {
    const sanitized = text.replace(/[^0-9.,]/g, '').replace(',', '.');
    setPercentText(sanitized);
    const percent = Math.max(0, Math.min(100, Number(sanitized) || 0));
    const cents = Number.isFinite(percent) ? Math.min(baseAmount, Math.round((baseAmount * percent) / 100)) : 0;
    onChange(cents);
  }

  function switchMode(next: DiscountMode) {
    if (next === 'percent') {
      setPercentText(formatPercentFromCents(valueCents, baseAmount));
    }
    setMode(next);
  }

  return (
    <View style={[styles.container, compact ? styles.containerCompact : null]}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, compact ? styles.labelCompact : null]}>{label}</Text>
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              compact ? styles.toggleButtonCompact : null,
              mode === 'amount' ? styles.toggleButtonActive : null,
            ]}
            onPress={() => switchMode('amount')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.toggleText,
                compact ? styles.toggleTextCompact : null,
                mode === 'amount' ? styles.toggleTextActive : null,
              ]}
            >
              R$
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              compact ? styles.toggleButtonCompact : null,
              mode === 'percent' ? styles.toggleButtonActive : null,
            ]}
            onPress={() => switchMode('percent')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.toggleText,
                compact ? styles.toggleTextCompact : null,
                mode === 'percent' ? styles.toggleTextActive : null,
              ]}
            >
              %
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {mode === 'amount' ? (
        <MaskedInput
          mask="currency"
          value={String(valueCents)}
          onChangeText={handleAmountChange}
          style={compact ? styles.maskedInputCompact : undefined}
        />
      ) : (
        <TextInput
          style={[styles.percentInput, compact ? styles.percentInputCompact : null]}
          keyboardType="decimal-pad"
          value={percentText}
          onChangeText={handlePercentChange}
          placeholder="0"
          placeholderTextColor={colors.slate400}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  containerCompact: {
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate700,
  },
  labelCompact: {
    fontSize: 12,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: radii.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButton: {
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
  toggleButtonCompact: {
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  toggleButtonActive: {
    backgroundColor: colors.accent,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate700,
  },
  toggleTextCompact: {
    fontSize: 11,
  },
  toggleTextActive: {
    color: colors.white,
  },
  percentInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  percentInputCompact: {
    paddingVertical: 8,
    fontSize: 14,
  },
  maskedInputCompact: {
    paddingVertical: 8,
    fontSize: 14,
  },
});
