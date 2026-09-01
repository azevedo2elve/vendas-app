import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { withObservables } from '@nozbe/watermelondb/react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { database } from '@/database';
import Order from '@/database/models/Order';
import Client from '@/database/models/Client';
import OrderItem from '@/database/models/OrderItem';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { LoadingView } from '@/components/LoadingView';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useToast } from '@/components/Toast';
import { deleteOrder, setOrderStatus } from '@/services/orderService';
import { shareOrderPdf } from '@/services/pdfService';
import { useLicenseAccess } from '@/hooks/useLicenseAccess';
import type { RootStackParamList } from '@/navigation/types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, PAYMENT_METHOD_LABELS } from '@/types/database';
import { colors, radii, spacing } from '@/theme';
import { formatCurrencyBRL } from '@/utils/masks';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

type DetailProps = { order: Order; client: Client; items: OrderItem[]; onBack: () => void };

function OrderDetailScreenBase({ order, client, items, onBack }: DetailProps) {
  const [updating, setUpdating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const { showToast } = useToast();
  const { readOnly } = useLicenseAccess();

  async function handleComplete() {
    setUpdating(true);
    try {
      await setOrderStatus(order.id, 'completed');
      showToast('Pedido concluído!', 'success');
    } finally {
      setUpdating(false);
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      await shareOrderPdf(order, client, items);
    } catch (error) {
      Alert.alert('Não foi possível compartilhar', String(error instanceof Error ? error.message : error));
    } finally {
      setSharing(false);
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
            showToast('Pedido cancelado.', 'info');
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
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
          <Badge label={ORDER_STATUS_LABELS[order.status]} tone={ORDER_STATUS_TONE[order.status]} />
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color={colors.slate500} />
          <Text style={styles.row}>{client?.name ?? '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.slate500} />
          <Text style={styles.row}>{order.createdAt.toLocaleString('pt-BR')}</Text>
        </View>
        {order.orderNumber > 0 ? (
          <View style={styles.infoRow}>
            <Ionicons name="pricetag-outline" size={16} color={colors.slate500} />
            <Text style={styles.row}>Pedido nº {order.orderNumber} deste cliente</Text>
          </View>
        ) : null}
        {order.deliveryDate ? (
          <View style={styles.infoRow}>
            <Ionicons name="cube-outline" size={16} color={colors.slate500} />
            <Text style={styles.row}>Entrega em {order.deliveryDate.toLocaleDateString('pt-BR')}</Text>
          </View>
        ) : null}
        <View style={styles.infoRow}>
          <Ionicons name="wallet-outline" size={16} color={colors.slate500} />
          <Text style={styles.row}>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</Text>
        </View>
        {order.notes ? (
          <View style={styles.infoRow}>
            <Ionicons name="chatbox-ellipses-outline" size={16} color={colors.slate500} />
            <Text style={styles.row}>{order.notes}</Text>
          </View>
        ) : null}
      </Card>

      <Card style={styles.card}>
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
      </Card>

      {readOnly ? (
        <Text style={styles.readOnlyNotice}>
          Licença expirada — somente leitura. Compartilhar, concluir, cancelar e excluir ficam indisponíveis.
        </Text>
      ) : null}

      <PrimaryButton
        label="Compartilhar (PDF / WhatsApp)"
        variant="success"
        icon="share-social-outline"
        onPress={handleShare}
        loading={sharing}
        disabled={readOnly}
      />
      {order.status === 'pending' ? (
        <PrimaryButton
          label="Marcar como concluído"
          icon="checkmark-circle-outline"
          onPress={handleComplete}
          loading={updating}
          disabled={readOnly}
        />
      ) : null}
      {order.status !== 'cancelled' ? (
        <PrimaryButton label="Cancelar pedido" variant="outline" onPress={handleCancel} disabled={updating || readOnly} />
      ) : null}
      <PrimaryButton
        label="Excluir pedido"
        variant="danger"
        icon="trash-outline"
        onPress={handleDelete}
        disabled={updating || readOnly}
      />
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
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  card: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  orderId: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textDisabled,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  row: {
    fontSize: 13.5,
    color: colors.textSecondary,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
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
    fontSize: 18,
    fontWeight: '800',
    color: colors.success,
  },
  readOnlyNotice: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.warningStrong,
    textAlign: 'center',
  },
});
