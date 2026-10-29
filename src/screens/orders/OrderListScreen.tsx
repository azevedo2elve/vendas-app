import { useCallback, useMemo, useState } from 'react';
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
import {
  formatMonthName,
  formatMonthYear,
  getDayRange,
  getMonthRange,
  getNextMonth,
  getPreviousMonth,
  isSameMonth,
  type MonthRange,
} from '@/utils/date';
import { formatCurrencyBRL } from '@/utils/masks';
import { isReceivableInRange, isSoldInRange, sumTotalNet } from '@/utils/orderTotals';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderList'>;

const STATUS_FILTERS: { label: string; value: OrderStatus | null }[] = [
  { label: 'Todos', value: null },
  { label: ORDER_STATUS_LABELS.pending, value: 'pending' },
  { label: ORDER_STATUS_LABELS.completed, value: 'completed' },
  { label: ORDER_STATUS_LABELS.cancelled, value: 'cancelled' },
];

type PeriodMode = 'month' | 'day' | 'all';
type DayKind = 'sold' | 'receivable' | 'all';

const DAY_KIND_FILTERS: { label: string; value: DayKind }[] = [
  { label: 'Vendidos', value: 'sold' },
  { label: 'A receber', value: 'receivable' },
  { label: 'Todos', value: 'all' },
];

function observeOrders(searchQuery: string, status: OrderStatus | null, dateFilter: MonthRange | null) {
  const clauses: Clause[] = [Q.sortBy('created_at', Q.desc)];

  if (status) {
    clauses.push(Q.where('status', status));
  }

  if (dateFilter) {
    const { startMs, endMs } = dateFilter;
    // Candidatos por `created_at` OU `payment_due_at` — o filtro exato pela data de referência
    // resolvida (`order.referenceDate`, mesmo critério do dashboard) é aplicado em memória em
    // `OrderListScreenBase`, pois o WatermelonDB não faz COALESCE em query.
    clauses.push(
      Q.or(
        Q.and(Q.where('created_at', Q.gte(startMs)), Q.where('created_at', Q.lte(endMs))),
        Q.and(Q.where('payment_due_at', Q.gte(startMs)), Q.where('payment_due_at', Q.lte(endMs)))
      )
    );
  }

  const trimmed = searchQuery.trim();
  if (trimmed) {
    clauses.push(Q.on('clients', Q.where('name', Q.like(`%${Q.sanitizeLikeString(trimmed)}%`))));
  }

  return database
    .get<Order>('orders')
    .query(...clauses)
    .observe();
}

function observeMonthOrders(year: number, month: number) {
  const { startMs, endMs } = getMonthRange(year, month);
  return database
    .get<Order>('orders')
    .query(
      Q.or(
        Q.and(Q.where('created_at', Q.gte(startMs)), Q.where('created_at', Q.lte(endMs))),
        Q.and(Q.where('payment_due_at', Q.gte(startMs)), Q.where('payment_due_at', Q.lte(endMs)))
      )
    )
    .observe();
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
      {order.paymentDueAt ? (
        <View style={styles.deliveryRow}>
          <Ionicons name="cash-outline" size={13} color={colors.success} />
          <Text style={[styles.deliveryText, { color: colors.success }]}>
            Recebimento em {order.paymentDueAt.toLocaleDateString('pt-BR')}
          </Text>
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
  monthOrders: Order[];
  year: number;
  month: number;
  periodMode: PeriodMode;
  onPeriodModeChange: (value: PeriodMode) => void;
  day: Date;
  dayKind: DayKind;
  onDayKindChange: (value: DayKind) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: OrderStatus | null;
  onStatusChange: (status: OrderStatus | null) => void;
};

function OrderListScreenBase({
  navigation,
  orders,
  monthOrders,
  year,
  month,
  periodMode,
  onPeriodModeChange,
  day,
  dayKind,
  onDayKindChange,
  onPrevDay,
  onNextDay,
  onPrevMonth,
  onNextMonth,
  onCurrentMonth,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: ListProps) {
  const { guard } = useReadOnlyGuard();

  const { startMs: activeMonthStartMs, endMs: activeMonthEndMs } = useMemo(
    () => getMonthRange(year, month),
    [year, month]
  );
  const isInActiveMonth = useCallback(
    (order: Order) => {
      const ref = order.referenceDate.getTime();
      return ref >= activeMonthStartMs && ref <= activeMonthEndMs;
    },
    [activeMonthStartMs, activeMonthEndMs]
  );

  // Lista do dia = pedidos vendidos (emitidos) no dia OU a receber no dia — os dois critérios dos
  // cards "Vendido hoje"/"A receber hoje" do Dashboard.
  const dayRange = useMemo(() => getDayRange(day), [day]);
  const isInActiveDay = useCallback(
    (order: Order) => {
      if (dayKind === 'sold') return isSoldInRange(order, dayRange);
      if (dayKind === 'receivable') return isReceivableInRange(order, dayRange);
      return isSoldInRange(order, dayRange) || isReceivableInRange(order, dayRange);
    },
    [dayRange, dayKind]
  );

  const displayedOrders = useMemo(() => {
    if (periodMode === 'month') return orders.filter(isInActiveMonth);
    if (periodMode === 'day') return orders.filter(isInActiveDay);
    return orders;
  }, [orders, periodMode, isInActiveMonth, isInActiveDay]);

  // O dia selecionado sempre cai no mês ativo (ver `selectDay`), então `monthOrders` já contém
  // todos os candidatos — totais do dia sem cancelados e sem depender da busca/status.
  const nonCancelledMonthOrders = useMemo(
    () => monthOrders.filter((order) => order.status !== 'cancelled'),
    [monthOrders]
  );
  const daySoldTotal = sumTotalNet(nonCancelledMonthOrders.filter((order) => isSoldInRange(order, dayRange)));
  const dayReceivableTotal = sumTotalNet(
    nonCancelledMonthOrders.filter((order) => isReceivableInRange(order, dayRange))
  );
  const dayLabel = day.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

  const validMonthOrders = useMemo(
    () => monthOrders.filter((order) => order.status !== 'cancelled' && isInActiveMonth(order)),
    [monthOrders, isInActiveMonth]
  );
  const monthTotalNet = useMemo(
    () => validMonthOrders.reduce((acc, order) => acc + order.totalNet, 0),
    [validMonthOrders]
  );
  const monthOrdersCount = validMonthOrders.length;
  const monthCompletedCount = useMemo(
    () => validMonthOrders.filter((order) => order.status === 'completed').length,
    [validMonthOrders]
  );
  const monthPendingCount = useMemo(
    () => validMonthOrders.filter((order) => order.status === 'pending').length,
    [validMonthOrders]
  );

  const isCurrent = isSameMonth(new Date(year, month, 15), new Date());
  const monthLabel = formatMonthYear(year, month);
  const monthShort = formatMonthName(month);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerSection}>
          {/* Card Resumo do Mês com navegação */}
          <View style={styles.monthCard}>
            <View style={styles.monthNav}>
              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={onPrevMonth}
                accessibilityLabel="Mês anterior"
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
              </TouchableOpacity>

              <View style={styles.monthTitleCenter}>
                <Text style={styles.monthTitleText}>{monthLabel}</Text>
                {!isCurrent ? (
                  <TouchableOpacity
                    style={styles.currentMonthBadge}
                    onPress={onCurrentMonth}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Voltar para o mês atual"
                  >
                    <Ionicons name="arrow-undo-outline" size={11} color={colors.accentDark} />
                    <Text style={styles.currentMonthBadgeText}>Ir para mês atual</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={onNextMonth}
                accessibilityLabel="Próximo mês"
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.monthStatsRow}>
              <View style={styles.monthStatBlock}>
                <Text style={styles.monthStatLabel}>Total vendido no mês</Text>
                <Text style={styles.monthStatValue} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrencyBRL(monthTotalNet)}
                </Text>
              </View>

              <View style={styles.monthStatDivider} />

              <View style={styles.monthStatBlock}>
                <Text style={styles.monthStatLabel}>Pedidos no mês</Text>
                <Text style={styles.monthStatOrdersCount}>
                  {monthOrdersCount} {monthOrdersCount === 1 ? 'pedido' : 'pedidos'}
                </Text>
                {monthOrdersCount > 0 ? (
                  <Text style={styles.monthStatSubtitle}>
                    {monthCompletedCount} conc. · {monthPendingCount} pend.
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Busca e filtros */}
          <View style={styles.filters}>
            <SearchBar placeholder="Buscar por nome do cliente" onDebouncedChange={onSearchChange} />

            {/* Alternar entre mês selecionado e todos os períodos */}
            <View style={styles.periodChips}>
              <Chip
                icon="calendar-outline"
                label={`Apenas ${monthShort}`}
                selected={periodMode === 'month'}
                onPress={() => onPeriodModeChange('month')}
              />
              <Chip
                icon="today-outline"
                label="Por dia"
                selected={periodMode === 'day'}
                onPress={() => onPeriodModeChange('day')}
              />
              <Chip
                icon="globe-outline"
                label="Todos os períodos"
                selected={periodMode === 'all'}
                onPress={() => onPeriodModeChange('all')}
              />
            </View>

            {periodMode === 'day' ? (
              <View style={styles.dayBar}>
                <TouchableOpacity
                  style={styles.monthNavBtn}
                  onPress={onPrevDay}
                  accessibilityLabel="Dia anterior"
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.dayBarCenter}>
                  <Text style={styles.dayBarDate}>{dayLabel}</Text>
                  <Text style={styles.dayBarTotal}>
                    Vendido {formatCurrencyBRL(daySoldTotal)} · A receber {formatCurrencyBRL(dayReceivableTotal)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.monthNavBtn}
                  onPress={onNextDay}
                  accessibilityLabel="Próximo dia"
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            ) : null}

            {periodMode === 'day' ? (
              <View style={styles.periodChips}>
                {DAY_KIND_FILTERS.map((filter) => (
                  <Chip
                    key={filter.value}
                    label={filter.label}
                    selected={dayKind === filter.value}
                    onPress={() => onDayKindChange(filter.value)}
                  />
                ))}
              </View>
            ) : null}

            {/* Filtro por status do pedido */}
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
        </View>

        <FlatList
          data={displayedOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={displayedOrders.length === 0 ? styles.emptyContent : styles.listContent}
          renderItem={({ item }) => (
            <OrderRow order={item} onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title={
                periodMode === 'month'
                  ? `Nenhum pedido em ${monthLabel}`
                  : periodMode === 'day'
                    ? `Nenhum pedido em ${day.toLocaleDateString('pt-BR')}`
                    : 'Nenhuma ordem de venda encontrada'
              }
              message={
                periodMode === 'month'
                  ? 'Nenhum pedido emitido neste mês. Você pode usar as setas acima para navegar entre os meses ou selecionar "Todos os períodos".'
                  : periodMode === 'day'
                    ? 'Nenhum pedido neste dia. Use as setas para navegar entre os dias.'
                    : 'Toque no botão + para criar a primeira.'
              }
            />
          }
        />
      </View>

      <Fab accessibilityLabel="Nova ordem de venda" onPress={() => guard(() => navigation.navigate('NewOrder'))} />
    </View>
  );
}

const enhance = withObservables(
  ['searchQuery', 'statusFilter', 'year', 'month', 'periodMode', 'day'],
  ({
    searchQuery,
    statusFilter,
    year,
    month,
    periodMode,
    day,
  }: {
    searchQuery: string;
    statusFilter: OrderStatus | null;
    year: number;
    month: number;
    periodMode: PeriodMode;
    day: Date;
  }) => ({
    orders: observeOrders(
      searchQuery,
      statusFilter,
      periodMode === 'month' ? getMonthRange(year, month) : periodMode === 'day' ? getDayRange(day) : null
    ),
    monthOrders: observeMonthOrders(year, month),
  })
);

const EnhancedOrderList = enhance(OrderListScreenBase);

export function OrderListScreen({ navigation, route }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);
  // Vindo de um card do Dashboard: abre "Por dia" em hoje com a seleção do card. Só no mount —
  // a lista fica empilhada sobre a Home, então voltar e tocar de novo sempre remonta a tela.
  const paramDayKind = route.params?.dayKind;
  const [periodMode, setPeriodMode] = useState<PeriodMode>(paramDayKind ? 'day' : 'month');
  const [day, setDay] = useState(() => new Date());
  const [dayKind, setDayKind] = useState<DayKind>(paramDayKind ?? 'all');

  const paramYear = route.params?.year;
  const paramMonth = route.params?.month;

  const [userPeriod, setUserPeriod] = useState<{ year: number; month: number } | null>(null);

  const period = useMemo(() => {
    if (userPeriod) return userPeriod;
    const now = new Date();
    return {
      year: paramYear ?? now.getFullYear(),
      month: paramMonth ?? now.getMonth(),
    };
  }, [userPeriod, paramYear, paramMonth]);

  const onSearchChange = useCallback((value: string) => setSearchQuery(value), []);

  // Mantém o mês ativo sempre no mês do dia selecionado (o resumo do mês e o total do dia saem
  // da mesma consulta `monthOrders`).
  const selectDay = useCallback((next: Date) => {
    setDay(next);
    setUserPeriod({ year: next.getFullYear(), month: next.getMonth() });
  }, []);

  const handlePeriodModeChange = useCallback(
    (mode: PeriodMode) => {
      setPeriodMode(mode);
      if (mode === 'day') selectDay(day);
    },
    [day, selectDay]
  );

  const handlePrevDay = useCallback(
    () => selectDay(new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1)),
    [day, selectDay]
  );
  const handleNextDay = useCallback(
    () => selectDay(new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)),
    [day, selectDay]
  );

  const handlePrevMonth = useCallback(() => {
    if (periodMode === 'day') {
      selectDay(new Date(day.getFullYear(), day.getMonth() - 1, 1));
      return;
    }
    setUserPeriod((curr) => {
      const active = curr ?? {
        year: paramYear ?? new Date().getFullYear(),
        month: paramMonth ?? new Date().getMonth(),
      };
      return getPreviousMonth(active.year, active.month);
    });
  }, [paramYear, paramMonth, periodMode, day, selectDay]);

  const handleNextMonth = useCallback(() => {
    if (periodMode === 'day') {
      selectDay(new Date(day.getFullYear(), day.getMonth() + 1, 1));
      return;
    }
    setUserPeriod((curr) => {
      const active = curr ?? {
        year: paramYear ?? new Date().getFullYear(),
        month: paramMonth ?? new Date().getMonth(),
      };
      return getNextMonth(active.year, active.month);
    });
  }, [paramYear, paramMonth, periodMode, day, selectDay]);

  const handleCurrentMonth = useCallback(() => {
    const now = new Date();
    if (periodMode === 'day') {
      selectDay(now);
      return;
    }
    setUserPeriod({ year: now.getFullYear(), month: now.getMonth() });
  }, [periodMode, selectDay]);

  return (
    <EnhancedOrderList
      navigation={navigation}
      route={route}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      statusFilter={statusFilter}
      onStatusChange={setStatusFilter}
      year={period.year}
      month={period.month}
      periodMode={periodMode}
      onPeriodModeChange={handlePeriodModeChange}
      day={day}
      dayKind={dayKind}
      onDayKindChange={setDayKind}
      onPrevDay={handlePrevDay}
      onNextDay={handleNextDay}
      onPrevMonth={handlePrevMonth}
      onNextMonth={handleNextMonth}
      onCurrentMonth={handleCurrentMonth}
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
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  monthCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleCenter: {
    alignItems: 'center',
    gap: 2,
  },
  monthTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  currentMonthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs + 2,
    backgroundColor: colors.accentLight,
    borderRadius: radii.pill,
  },
  currentMonthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentDark,
  },
  monthStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  monthStatBlock: {
    flex: 1,
    gap: 2,
  },
  monthStatLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  monthStatValue: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.success,
  },
  monthStatDivider: {
    width: 1,
    height: 34,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  monthStatOrdersCount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  monthStatSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  filters: {
    gap: spacing.xs,
  },
  periodChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dayBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
  },
  dayBarCenter: {
    alignItems: 'center',
    gap: 2,
  },
  dayBarDate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  dayBarTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
  },
  statusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: 100,
    gap: spacing.sm,
  },
  emptyContent: {
    flexGrow: 1,
    paddingTop: spacing.md,
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
