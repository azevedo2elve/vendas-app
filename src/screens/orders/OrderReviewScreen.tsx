import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOrderDraft } from '@/hooks/useOrderDraft';
import { createOrder } from '@/services/orderService';
import { DiscountInput } from '@/components/DiscountInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { OrderDraftStackParamList, RootStackParamList } from '@/navigation/types';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/types/database';
import { cartItemLineTotal, cartItemSubtotal } from '@/types/orderDraft';
import { formatCurrencyBRL } from '@/utils/masks';

type Props = NativeStackScreenProps<OrderDraftStackParamList, 'OrderReview'>;

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

export function OrderReviewScreen({ navigation }: Props) {
  const { clientId, clientName, items, totals, reset } = useOrderDraft();
  const [discountTotal, setDiscountTotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const totalNet = Math.max(0, totals.totalGross - discountTotal);

  async function handleSave() {
    if (!clientId) return;

    setSaving(true);
    try {
      const order = await createOrder({ clientId, items, discountTotal, paymentMethod, notes });
      reset();

      const parentNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
      parentNavigation?.replace('OrderDetail', { orderId: order.id });
    } catch (error) {
      Alert.alert('Erro ao salvar pedido', String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cliente</Text>
        <Text style={styles.clientName}>{clientName}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Itens ({totals.quantityTotal})</Text>
        {items.map((item) => (
          <View key={item.productId} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.itemDetail}>
                {item.quantity} × {formatCurrencyBRL(item.unitPrice)}
                {item.discountValue > 0 ? ` − ${formatCurrencyBRL(item.discountValue)} desc.` : ''}
              </Text>
            </View>
            <Text style={styles.itemSubtotal}>{formatCurrencyBRL(cartItemSubtotal(item))}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fechamento</Text>

        <DiscountInput label="Desconto geral do pedido" baseAmount={totals.totalGross} valueCents={discountTotal} onChange={setDiscountTotal} />

        <View>
          <Text style={styles.label}>Forma de pagamento</Text>
          <View style={styles.paymentChips}>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method}
                style={[styles.paymentChip, paymentMethod === method ? styles.paymentChipSelected : null]}
                onPress={() => setPaymentMethod(method)}
              >
                <Text
                  style={[styles.paymentChipText, paymentMethod === method ? styles.paymentChipTextSelected : null]}
                >
                  {PAYMENT_METHOD_LABELS[method]}
                </Text>
              </TouchableOpacity>
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
            placeholderTextColor="#94A3B8"
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
      </View>

      <PrimaryButton label="Salvar pedido" onPress={handleSave} loading={saving} disabled={!clientId || items.length === 0} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  clientName: {
    fontSize: 15,
    color: '#334155',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  itemDetail: {
    fontSize: 12,
    color: '#64748B',
  },
  itemSubtotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  paymentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  paymentChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  paymentChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  paymentChipTextSelected: {
    color: '#FFFFFF',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  summary: {
    gap: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#475569',
  },
  summaryValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16A34A',
  },
});
