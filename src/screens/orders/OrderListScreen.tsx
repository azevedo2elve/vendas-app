import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import type { Clause } from '@nozbe/watermelondb/QueryDescription';
import { withObservables } from '@nozbe/watermelondb/react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { database } from '@/database';
import Order from '@/database/models/Order';
import Client from '@/database/models/Client';
import { Badge } from '@/components/Badge';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { useReadOnlyGuard } from '@/hooks/useLicenseAccess';
import { SearchBar } from '@/components/SearchBar';
import type { RootStackParamList } from '@/navigation/types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, type OrderStatus } from '@/types/database';
import { colors, radii, shadows, spacing } from '@/theme';
import { formatCurrencyBRL } from '@/utils/masks';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderList'>;

const STATUS_FILTERS: { label: string; value: OrderStatus | null }[] = [
  { label: 'Todos', value: null },
  { label: ORDER_STATUS_LABELS.pending, value: 'pending' },
  { label: ORDER_STATUS_LABELS.completed, value: 'completed' },
  { label: ORDER_STATUS_LABELS.cancelled, value: 'cancelled' },
];

function observeOrders(searchQuery: string, status: OrderStatus | null) {
  const clauses: Clause[] = [Q.sortBy('created_at', Q.desc)];

  if (status) {
    clauses.push(Q.where('status', status));
  }

  const trimmed = searchQuery.trim();
  if (trimmed) {
    clauses.push(Q.on('clients', Q.where('name', Q.like(`%${Q.sanitizeLikeString(trimmed)}%`))));
  }

  return database.get<Order>('orders').query(...clauses).observe();
}

type OrderRowProps = { order: Order; onPress: () => void };

function OrderRowBase({ order, client, itemCount, onPress }: OrderRowProps & { client: Client; itemCount: number }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
        <Badge label={ORDER_STATUS_LABELS[order.status]} tone={ORDER_STATUS_TONE[order.status]} />
      </View>
      <Text style={styles.cardClient}>{client?.name ?? '—'}</Text>
      {order.deliveryDate ? (
        <View style={styles.deliveryRow}>
          <Ionicons name="cube-outline" size={13} color={colors.accent} />
          <Text style={styles.deliveryText}>Entrega em {order.deliveryDate.toLocaleDateString('pt-BR')}</Text>
        </View>
      ) : null}
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>
          {order.createdAt.toLocaleString('pt-BR')} · {itemCount} {itemCount === 1 ? 'item' : 'itens'}
        </Text>
        <Text style={styles.cardTotal}>{formatCurrencyBRL(order.totalNet)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const enhanceRow = withObservables(['order'], ({ order }: OrderRowProps) => ({
  order,
  client: order.client.observe(),
  itemCount: order.items.observeCount(),
}));

const OrderRow = enhanceRow(OrderRowBase);

type ListProps = Props & {
  orders: Order[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: OrderStatus | null;
  onStatusChange: (status: OrderStatus | null) => void;
};

function OrderListScreenBase({ navigation, orders, onSearchChange, statusFilter, onStatusChange }: ListProps) {
  const { guard } = useReadOnlyGuard();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.filters}>
          <SearchBar placeholder="Buscar por nome do cliente" onDebouncedChange={onSearchChange} />
          <View style={styles.statusChips}>
            {STATUS_FILTERS.map((filter) => (
              <Chip
                key={filter.label}
                label={filter.label}
                selected={statusFilter === filter.value}
                onPress={() => onStatusChange(filter.value)}
              />
            ))}
          </View>
        </View>

        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={orders.length === 0 ? styles.emptyContent : styles.listContent}
          renderItem={({ item }) => (
            <OrderRow order={item} onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="Nenhuma ordem de venda encontrada"
              message="Toque no botão + para criar a primeira."
            />
          }
        />
      </View>

      <Fab accessibilityLabel="Nova ordem de venda" onPress={() => guard(() => navigation.navigate('NewOrder'))} />
    </View>
  );
}

const enhance = withObservables(
  ['searchQuery', 'statusFilter'],
  ({ searchQuery, statusFilter }: { searchQuery: string; statusFilter: OrderStatus | null }) => ({
    orders: observeOrders(searchQuery, statusFilter),
  })
);

const EnhancedOrderList = enhance(OrderListScreenBase);

export function OrderListScreen({ navigation, route }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);
  const onSearchChange = useCallback((value: string) => setSearchQuery(value), []);

  return (
    <EnhancedOrderList
      navigation={navigation}
      route={route}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      statusFilter={statusFilter}
      onStatusChange={setStatusFilter}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
  },
  filters: {
    padding: spacing.lg,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  statusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
    gap: spacing.sm,
  },
  emptyContent: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardId: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textDisabled,
  },
  cardClient: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deliveryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  cardTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.success,
  },
});
