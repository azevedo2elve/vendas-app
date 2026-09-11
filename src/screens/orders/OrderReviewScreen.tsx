import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useOrderDraft } from '@/hooks/useOrderDraft';
import { createOrder } from '@/services/orderService';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { DiscountInput } from '@/components/DiscountInput';
import { MaskedInput } from '@/components/MaskedInput';
import { OrderProgressBar } from '@/components/OrderProgressBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { OrderDraftStackParamList } from '@/navigation/types';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/types/database';
import { cartItemSubtotal } from '@/types/orderDraft';
import { colors, radii, spacing } from '@/theme';
import { formatCurrencyBRL, parseDateBR } from '@/utils/masks';

type Props = NativeStackScreenProps<OrderDraftStackParamList, 'OrderReview'>;

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

const PAYMENT_ICONS: Record<PaymentMethod, keyof typeof Ionicons.glyphMap> = {
  dinheiro: 'cash-outline',
  pix: 'flash-outline',
  boleto: 'barcode-outline',
  cartao_credito: 'card-outline',
  cartao_debito: 'card-outline',
  a_prazo: 'time-outline',
};

export function OrderReviewScreen({ navigation }: Props) {
  const { clientId, clientName, items, totals, reset } = useOrderDraft();
  const [discountTotal, setDiscountTotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [notes, setNotes] = useState('');
  const [deliveryDateDigits, setDeliveryDateDigits] = useState('');
  const [deliveryDateError, setDeliveryDateError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const totalNet = Math.max(0, totals.totalGross - discountTotal);

  async function handleSave() {
    if (!clientId) return;

    let deliveryDate: Date | null = null;
    if (deliveryDateDigits.length > 0) {
      deliveryDate = parseDateBR(deliveryDateDigits);
      if (!deliveryDate) {
        setDeliveryDateError('Data de entrega inválida');
        return;
      }
    }
    setDeliveryDateError(undefined);

    setSaving(true);
    try {
      const order = await createOrder({ clientId, items, discountTotal, paymentMethod, notes, deliveryDate });
      reset();
      navigation.navigate('OrderSuccess', { orderId: order.id });
    } catch (error) {
      Alert.alert('Erro ao salvar pedido', String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <OrderProgressBar step={3} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Cliente</Text>
          <View style={styles.clientRow}>
            <Ionicons name="person-circle-outline" size={22} color={colors.accent} />
            <Text style={styles.clientName}>{clientName}</Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Itens ({totals.quantityTotal})</Text>
          {items.map((item) => (
            <View key={item.productId} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemDetail}>
                  {item.quantity} × {formatCurrencyBRL(item.unitPrice)}
                </Text>
              </View>
              <Text style={styles.itemSubtotal}>{formatCurrencyBRL(cartItemSubtotal(item))}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Fechamento</Text>

          <DiscountInput
            label="Desconto geral do pedido"
            baseAmount={totals.totalGross}
            valueCents={discountTotal}
            onChange={setDiscountTotal}
          />

          <MaskedInput
            label="Data de entrega"
            mask="date"
            placeholder="dd/mm/aaaa (opcional)"
            value={deliveryDateDigits}
            onChangeText={(value) => {
              setDeliveryDateDigits(value);
              setDeliveryDateError(undefined);
            }}
            error={deliveryDateError}
          />

          <View>
            <Text style={styles.label}>Forma de pagamento</Text>
            <View style={styles.paymentChips}>
              {PAYMENT_METHODS.map((method) => (
                <Chip
                  key={method}
                  label={PAYMENT_METHOD_LABELS[method]}
                  icon={PAYMENT_ICONS[method]}
                  selected={paymentMethod === method}
                  onPress={() => setPaymentMethod(method)}
                />
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.label}>Observações</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Observações gerais do pedido (opcional)"
              placeholderTextColor={colors.slate400}
              multiline
            />
          </View>

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total dos itens</Text>
              <Text style={styles.summaryValue}>{formatCurrencyBRL(totals.totalGross)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Desconto geral</Text>
              <Text style={styles.summaryValue}>-{formatCurrencyBRL(discountTotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total líquido</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrencyBRL(totalNet)}</Text>
            </View>
          </View>
        </Card>

        <PrimaryButton
          label="Salvar pedido"
          icon="checkmark-circle-outline"
          onPress={handleSave}
          loading={saving}
          disabled={!clientId || items.length === 0}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  card: {
    gap: spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate700,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.xs,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  itemDetail: {
    fontSize: 12,
    color: colors.textMuted,
  },
  itemSubtotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate700,
    marginBottom: spacing.xs,
  },
  paymentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  notesInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  summary: {
    gap: 4,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.success,
  },
});
