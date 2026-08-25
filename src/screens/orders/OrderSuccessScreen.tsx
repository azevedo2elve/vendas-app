import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { database } from '@/database';
import Client from '@/database/models/Client';
import Order from '@/database/models/Order';
import OrderItem from '@/database/models/OrderItem';
import { Card } from '@/components/Card';
import { LoadingView } from '@/components/LoadingView';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useToast } from '@/components/Toast';
import { shareOrderPdf } from '@/services/pdfService';
import type { OrderDraftStackParamList, RootStackParamList } from '@/navigation/types';
import { colors, radii, spacing } from '@/theme';
import { formatCurrencyBRL } from '@/utils/masks';

type Props = NativeStackScreenProps<OrderDraftStackParamList, 'OrderSuccess'>;

type Loaded = { order: Order; client: Client; items: OrderItem[] };

export function OrderSuccessScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const [data, setData] = useState<Loaded | null>(null);
  const [sharing, setSharing] = useState(false);
  const { showToast } = useToast();
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const order = await database.get<Order>('orders').find(orderId);
      const [client, items] = await Promise.all([order.client.fetch(), order.items.fetch()]);
      if (!cancelled) setData({ order, client, items });
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (!data) return;
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
  }, [data, scale]);

  async function handleShare() {
    if (!data) return;
    setSharing(true);
    try {
      await shareOrderPdf(data.order, data.client, data.items);
    } catch (error) {
      Alert.alert('Não foi possível compartilhar', String(error instanceof Error ? error.message : error));
    } finally {
      setSharing(false);
    }
  }

  function handleBackToHome() {
    showToast('Pedido emitido com sucesso!', 'success');
    const parentNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
    parentNavigation?.reset({ index: 0, routes: [{ name: 'Home' }] });
  }

  if (!data) {
    return <LoadingView message="Preparando resumo do pedido..." />;
  }

  const { order, client, items } = data;
  const orderCode = order.id.slice(0, 8).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconCircle, { transform: [{ scale }] }]}>
          <Ionicons name="checkmark" size={48} color={colors.white} />
        </Animated.View>

        <Text style={styles.title}>Pedido emitido com sucesso!</Text>
        <Text style={styles.subtitle}>Ordem de venda #{orderCode} salva localmente.</Text>

        <Card style={styles.summaryCard} elevated>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Cliente</Text>
            <Text style={styles.summaryValue}>{client.name}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Itens</Text>
            <Text style={styles.summaryValue}>
              {items.length} {items.length === 1 ? 'produto' : 'produtos'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelStrong}>Total do pedido</Text>
            <Text style={styles.totalValue}>{formatCurrencyBRL(order.totalNet)}</Text>
          </View>
        </Card>

        <View style={styles.actions}>
          <PrimaryButton
            label="Compartilhar Ordem de Venda (PDF / WhatsApp)"
            variant="success"
            icon="share-social-outline"
            onPress={handleShare}
            loading={sharing}
          />
          <PrimaryButton label="Voltar para o Início" variant="outline" icon="home-outline" onPress={handleBackToHome} />
        </View>
      </View>
    </View>
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
    maxWidth: 520,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: radii.pill,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  summaryCard: {
    width: '100%',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryLabelStrong: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.success,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
});
