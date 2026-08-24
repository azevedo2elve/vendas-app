import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { withObservables } from '@nozbe/watermelondb/react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { database } from '@/database';
import Order from '@/database/models/Order';
import Client from '@/database/models/Client';
import OrderItem from '@/database/models/OrderItem';
import { LoadingView } from '@/components/LoadingView';
import { PrimaryButton } from '@/components/PrimaryButton';
import { deleteOrder, setOrderStatus } from '@/services/orderService';
import type { RootStackParamList } from '@/navigation/types';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/types/database';
import { formatCurrencyBRL } from '@/utils/masks';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

type DetailProps = { order: Order; client: Client; items: OrderItem[]; onBack: () => void };

function OrderDetailScreenBase({ order, client, items, onBack }: DetailProps) {
  const [updating, setUpdating] = useState(false);

  async function handleComplete() {
    setUpdating(true);
    try {
      await setOrderStatus(order.id, 'completed');
    } finally {
      setUpdating(false);
    }
  }

  function handleCancel() {
    Alert.alert('Cancelar pedido', 'Tem certeza que deseja cancelar este pedido?', [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Cancelar pedido',
        style: 'destructive',
        onPress: async () => {
          setUpdating(true);
          try {
            await setOrderStatus(order.id, 'cancelled');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  }

  function handleDelete() {
    Alert.alert('Excluir pedido', 'Esta ação remove o pedido e todos os seus itens permanentemente. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteOrder(order.id);
          onBack();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
          <View style={[styles.statusBadge, styles[`status_${order.status}`]]}>
            <Text style={styles.statusText}>{ORDER_STATUS_LABELS[order.status]}</Text>
          </View>
        </View>
        <Text style={styles.row}>Cliente: {client?.name ?? '—'}</Text>
        <Text style={styles.row}>Data: {order.createdAt.toLocaleString('pt-BR')}</Text>
        <Text style={styles.row}>Forma de pagamento: {PAYMENT_METHOD_LABELS[order.paymentMethod]}</Text>
        {order.notes ? <Text style={styles.row}>Observações: {order.notes}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Itens</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.productNameSnapshot}</Text>
              <Text style={styles.itemDetail}>
                {item.quantity} × {formatCurrencyBRL(item.unitPrice)}
                {item.discountValue > 0 ? ` − ${formatCurrencyBRL(item.discountValue)} desc.` : ''}
              </Text>
            </View>
            <Text style={styles.itemSubtotal}>{formatCurrencyBRL(item.subtotal)}</Text>
          </View>
        ))}

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total bruto</Text>
            <Text style={styles.summaryValue}>{formatCurrencyBRL(order.totalGross)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Desconto geral</Text>
            <Text style={styles.summaryValue}>-{formatCurrencyBRL(order.discountTotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total líquido</Text>
            <Text style={styles.summaryTotalValue}>{formatCurrencyBRL(order.totalNet)}</Text>
          </View>
        </View>
      </View>

      {order.status === 'pending' ? (
        <PrimaryButton label="Marcar como concluído" onPress={handleComplete} loading={updating} />
      ) : null}
      {order.status !== 'cancelled' ? (
        <PrimaryButton label="Cancelar pedido" variant="outline" onPress={handleCancel} disabled={updating} />
      ) : null}
      <PrimaryButton label="Excluir pedido" variant="danger" onPress={handleDelete} disabled={updating} />
    </ScrollView>
  );
}

const enhance = withObservables(['order'], ({ order }: { order: Order }) => ({
  order,
  client: order.client.observe(),
  items: order.items.observe(),
}));

const EnhancedOrderDetail = enhance(OrderDetailScreenBase);

export function OrderDetailScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    let cancelled = false;
    database
      .get<Order>('orders')
      .find(orderId)
      .then((found) => {
        if (!cancelled) setOrder(found);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (!order) {
    return <LoadingView message="Carregando pedido..." />;
  }

  return <EnhancedOrderDetail order={order} onBack={() => navigation.goBack()} />;
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
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  status_pending: {
    backgroundColor: '#FEF3C7',
  },
  status_completed: {
    backgroundColor: '#DCFCE7',
  },
  status_cancelled: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  row: {
    fontSize: 13,
    color: '#475569',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
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
