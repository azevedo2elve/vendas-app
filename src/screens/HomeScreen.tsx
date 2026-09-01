import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/database';
import Client from '@/database/models/Client';
import Order from '@/database/models/Order';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { LoadingView } from '@/components/LoadingView';
import { SectionHeader } from '@/components/SectionHeader';
import { StatCard } from '@/components/StatCard';
import { testSupabaseFetch } from '@/services/licenseService';
import { getOrCreateCompanySettings, resolveDisplayName } from '@/services/settingsService';
import { useReadOnlyGuard } from '@/hooks/useLicenseAccess';
import type { RootStackParamList } from '@/navigation/types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from '@/types/database';
import { colors, radii, shadows, spacing } from '@/theme';
import { formatCurrencyBRL } from '@/utils/masks';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type RecentOrder = { order: Order; clientName: string };

type DashboardData = {
  displayName: string;
  clientsCount: number;
  ordersCount: number;
  totalToday: number;
  recentOrders: RecentOrder[];
};

async function loadDashboardData(): Promise<DashboardData> {
  const ordersCollection = database.get<Order>('orders');
  const clientsCollection = database.get<Client>('clients');

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [companySettings, clientsCount, ordersCount, todayOrders, recentOrders] = await Promise.all([
    getOrCreateCompanySettings(),
    clientsCollection.query().fetchCount(),
    ordersCollection.query().fetchCount(),
    ordersCollection
      .query(Q.where('created_at', Q.gte(startOfDay.getTime())), Q.where('status', Q.notEq('cancelled')))
      .fetch(),
    ordersCollection.query(Q.sortBy('created_at', Q.desc), Q.take(5)).fetch(),
  ]);

  const totalToday = todayOrders.reduce((acc, order) => acc + order.totalNet, 0);

  const recentWithClients = await Promise.all(
    recentOrders.map(async (order) => {
      const client = await order.client.fetch();
      return { order, clientName: client?.name ?? '—' };
    })
  );

  return {
    displayName: resolveDisplayName(companySettings),
    clientsCount,
    ordersCount,
    totalToday,
    recentOrders: recentWithClients,
  };
}

export function HomeScreen({ navigation }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const insets = useSafeAreaInsets();
  const netInfo = useNetInfo();
  const { readOnly, guard } = useReadOnlyGuard();

  const refresh = useCallback(async () => {
    const dashboard = await loadDashboardData();
    setData(dashboard);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  async function handleTestSupabase() {
    setTesting(true);
    setTestResult(null);
    const result = await testSupabaseFetch();
    setTestResult(result);
    setTesting(false);
  }

  if (!data) {
    return <LoadingView message="Carregando painel..." />;
  }

  const isOnline = netInfo.isConnected !== false;
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{data.displayName}</Text>
          <Text style={styles.dateText}>{today}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="Configurações"
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={20} color={colors.slate600} />
          </TouchableOpacity>
          <View style={styles.statusPills}>
            <View style={[styles.statusPill, isOnline ? styles.statusPillOnline : styles.statusPillOffline]}>
              <Ionicons
                name={isOnline ? 'wifi' : 'cloud-offline-outline'}
                size={13}
                color={isOnline ? colors.success : colors.warningStrong}
              />
              <Text style={[styles.statusPillText, { color: isOnline ? colors.successStrong : colors.warningStrong }]}>
                {isOnline ? 'Online' : 'Modo Offline Ativo'}
              </Text>
            </View>
            <View style={[styles.statusPill, readOnly ? styles.statusPillOffline : styles.statusPillLicense]}>
              <Ionicons
                name={readOnly ? 'time-outline' : 'shield-checkmark'}
                size={13}
                color={readOnly ? colors.warningStrong : colors.accent}
              />
              <Text style={[styles.statusPillText, { color: readOnly ? colors.warningStrong : colors.accentDark }]}>
                {readOnly ? 'Somente leitura' : 'Licença Válida'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Vendido hoje" value={formatCurrencyBRL(data.totalToday)} icon="cash-outline" tone="success" />
        <StatCard label="Pedidos emitidos" value={String(data.ordersCount)} icon="receipt-outline" tone="accent" />
        <StatCard label="Clientes cadastrados" value={String(data.clientsCount)} icon="people-outline" tone="neutral" />
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={() => guard(() => navigation.navigate('NewOrder'))}
          activeOpacity={0.85}
        >
          <View style={styles.primaryActionIcon}>
            <Ionicons name="add" size={22} color={colors.white} />
          </View>
          <View style={styles.primaryActionTextWrap}>
            <Text style={styles.primaryActionTitle}>Nova Venda</Text>
            <Text style={styles.primaryActionSubtitle}>Iniciar uma ordem de venda</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.white} />
        </TouchableOpacity>

        <View style={styles.secondaryActionsRow}>
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => guard(() => navigation.navigate('ClientForm', undefined))}
            activeOpacity={0.75}
          >
            <Ionicons name="person-add-outline" size={20} color={colors.accent} />
            <Text style={styles.secondaryActionText}>Novo Cliente</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => navigation.navigate('ProductList')}
            activeOpacity={0.75}
          >
            <Ionicons name="grid-outline" size={20} color={colors.accent} />
            <Text style={styles.secondaryActionText}>Catálogo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => navigation.navigate('Backup')}
            activeOpacity={0.75}
          >
            <Ionicons name="cloud-upload-outline" size={20} color={colors.accent} />
            <Text style={styles.secondaryActionText}>Backup</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Últimos pedidos" actionLabel="Ver todos" onAction={() => navigation.navigate('OrderList')} />

        {data.recentOrders.length === 0 ? (
          <Card>
            <EmptyState
              icon="receipt-outline"
              title="Nenhum pedido ainda"
              message="Toque em 'Nova Venda' para emitir o primeiro pedido."
            />
          </Card>
        ) : (
          <View style={styles.recentList}>
            {data.recentOrders.map(({ order, clientName }) => (
              <TouchableOpacity
                key={order.id}
                style={styles.recentCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
              >
                <View style={styles.recentInfo}>
                  <Text style={styles.recentClient} numberOfLines={1}>
                    {clientName}
                  </Text>
                  <Text style={styles.recentMeta}>
                    {order.createdAt.toLocaleDateString('pt-BR')} · #{order.id.slice(0, 6).toUpperCase()}
                  </Text>
                  {order.deliveryDate ? (
                    <View style={styles.recentDeliveryRow}>
                      <Ionicons name="cube-outline" size={12} color={colors.accent} />
                      <Text style={styles.recentDeliveryText}>
                        Entrega em {order.deliveryDate.toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.recentRight}>
                  <Text style={styles.recentValue}>{formatCurrencyBRL(order.totalNet)}</Text>
                  <Badge label={ORDER_STATUS_LABELS[order.status]} tone={ORDER_STATUS_TONE[order.status]} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.moduleLink}
          onPress={() => navigation.navigate('ClientList')}
          activeOpacity={0.7}
        >
          <Ionicons name="people-outline" size={18} color={colors.slate600} />
          <Text style={styles.moduleLinkText}>Gerenciar clientes</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.slate300} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.moduleLink}
          onPress={() => navigation.navigate('OrderList')}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={18} color={colors.slate600} />
          <Text style={styles.moduleLinkText}>Todas as ordens de venda</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.slate300} />
        </TouchableOpacity>
      </View>

      {__DEV__ ? (
        <Card style={styles.debugCard}>
          <Text style={styles.debugTitle}>Debug — Supabase (dev)</Text>
          <TouchableOpacity style={styles.debugButton} onPress={handleTestSupabase} disabled={testing}>
            {testing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.debugButtonText}>Testar fetch no Supabase</Text>
            )}
          </TouchableOpacity>
          {testResult ? (
            <Text style={[styles.debugResult, { color: testResult.ok ? colors.success : colors.danger }]}>
              {testResult.ok ? '✓ ' : '✗ '}
              {testResult.message}
            </Text>
          ) : null}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPills: {
    gap: 6,
    alignItems: 'flex-end',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
  },
  statusPillOnline: {
    backgroundColor: colors.successBgSoft,
  },
  statusPillOffline: {
    backgroundColor: colors.warningBg,
  },
  statusPillLicense: {
    backgroundColor: colors.accentLight,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  quickActions: {
    gap: spacing.sm,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.raised,
  },
  primaryActionIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionTextWrap: {
    flex: 1,
  },
  primaryActionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.white,
  },
  primaryActionSubtitle: {
    fontSize: 12.5,
    color: colors.accentSoft,
    marginTop: 1,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    ...shadows.card,
  },
  secondaryActionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.slate700,
  },
  section: {
    gap: spacing.xs,
  },
  recentList: {
    gap: spacing.xs,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    ...shadows.card,
  },
  recentInfo: {
    flex: 1,
    gap: 2,
    marginRight: spacing.sm,
  },
  recentClient: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recentMeta: {
    fontSize: 11.5,
    color: colors.textMuted,
  },
  recentDeliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  recentDeliveryText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
  },
  recentRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  recentValue: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.success,
  },
  moduleLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  moduleLinkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  debugCard: {
    gap: spacing.sm,
    borderStyle: 'dashed',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  debugButton: {
    backgroundColor: colors.navy800,
    paddingVertical: 10,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  debugButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  debugResult: {
    fontSize: 12,
    fontWeight: '600',
  },
});
