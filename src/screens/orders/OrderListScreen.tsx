import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import type { Clause } from '@nozbe/watermelondb/QueryDescription';
import { withObservables } from '@nozbe/watermelondb/react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { database } from '@/database';
import Order from '@/database/models/Order';
import Client from '@/database/models/Client';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { SearchBar } from '@/components/SearchBar';
import type { RootStackParamList } from '@/navigation/types';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/types/database';
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
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
        <View style={[styles.statusBadge, styles[`status_${order.status}`]]}>
          <Text style={styles.statusText}>{ORDER_STATUS_LABELS[order.status]}</Text>
        </View>
      </View>
      <Text style={styles.cardClient}>{client?.name ?? '—'}</Text>
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
  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <SearchBar placeholder="Buscar por nome do cliente" onDebouncedChange={onSearchChange} />
        <View style={styles.statusChips}>
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.label}
              style={[styles.statusChip, statusFilter === filter.value ? styles.statusChipSelected : null]}
              onPress={() => onStatusChange(filter.value)}
            >
              <Text
                style={[
                  styles.statusChipText,
                  statusFilter === filter.value ? styles.statusChipTextSelected : null,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
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
          <EmptyState title="Nenhuma ordem de venda encontrada" message="Toque no botão + para criar a primeira." />
        }
      />

      <Fab accessibilityLabel="Nova ordem de venda" onPress={() => navigation.navigate('NewOrder')} />
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
    backgroundColor: '#F8FAFC',
  },
  filters: {
    padding: 16,
    paddingBottom: 8,
    gap: 10,
  },
  statusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  statusChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  statusChipTextSelected: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
    gap: 10,
  },
  emptyContent: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardId: {
    fontSize: 12,
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
  cardClient: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  cardTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16A34A',
  },
});
