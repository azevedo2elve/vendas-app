import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DiscountInput } from './DiscountInput';
import { colors, radii, spacing } from '@/theme';
import { formatCurrencyBRL } from '@/utils/masks';

type ItemDiscountControlProps = {
  unitPrice: number;
  quantity: number;
  discountValue: number;
  onChangeDiscount: (cents: number) => void;
  disabled?: boolean;
};

export function ItemDiscountControl({
  unitPrice,
  quantity,
  discountValue,
  onChangeDiscount,
  disabled = false,
}: ItemDiscountControlProps) {
  const [expanded, setExpanded] = useState(false);
  const baseAmount = unitPrice * quantity;
  const hasDiscount = discountValue > 0;
  const percent = baseAmount > 0 ? Math.round((discountValue / baseAmount) * 100) : 0;

  if (expanded) {
    return (
      <View style={styles.editorContainer}>
        <View style={styles.editorHeader}>
          <View style={styles.editorTitleRow}>
            <Ionicons name="pricetag" size={13} color={colors.accent} />
            <Text style={styles.editorTitle}>Desconto no item</Text>
          </View>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => setExpanded(false)}
            activeOpacity={0.7}
            accessibilityLabel="Concluir edição do desconto"
          >
            <Ionicons name="checkmark" size={13} color={colors.white} />
            <Text style={styles.doneButtonText}>Concluir</Text>
          </TouchableOpacity>
        </View>

        <DiscountInput
          baseAmount={baseAmount}
          valueCents={discountValue}
          onChange={onChangeDiscount}
          compact
        />

        {hasDiscount ? (
          <TouchableOpacity
            style={styles.removeDiscountLink}
            onPress={() => {
              onChangeDiscount(0);
              setExpanded(false);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={13} color={colors.danger} />
            <Text style={styles.removeDiscountText}>Remover desconto deste item</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  if (hasDiscount) {
    return (
      <View style={styles.badgeRow}>
        <TouchableOpacity
          style={styles.discountBadge}
          onPress={() => !disabled && setExpanded(true)}
          disabled={disabled}
          activeOpacity={0.7}
          accessibilityLabel={`Desconto de ${formatCurrencyBRL(discountValue)}, toque para alterar`}
        >
          <Ionicons name="pricetag" size={12} color={colors.success} />
          <Text style={styles.discountBadgeText}>
            -{formatCurrencyBRL(discountValue)} ({percent}%)
          </Text>
          {!disabled ? <Ionicons name="create-outline" size={12} color={colors.success} /> : null}
        </TouchableOpacity>

        {!disabled ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => onChangeDiscount(0)}
            accessibilityLabel="Remover desconto do item"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={colors.slate400} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.addDiscountButton}
      onPress={() => !disabled && setExpanded(true)}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityLabel="Adicionar desconto a este item"
    >
      <Ionicons name="pricetag-outline" size={12} color={colors.accent} />
      <Text style={styles.addDiscountText}>Desconto</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  addDiscountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
  },
  addDiscountText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.accent,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successLight,
  },
  discountBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.successStrong,
  },
  clearButton: {
    padding: 2,
  },
  editorContainer: {
    width: '100%',
    backgroundColor: colors.slate50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.xs,
    marginTop: 4,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  editorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
  },
  doneButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  removeDiscountLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginTop: 2,
    paddingVertical: 2,
  },
  removeDiscountText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.danger,
  },
});
