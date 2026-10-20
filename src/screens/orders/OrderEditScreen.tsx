import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { database } from '@/database';
import Order from '@/database/models/Order';
import Product from '@/database/models/Product';
import Category from '@/database/models/Category';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { DiscountInput } from '@/components/DiscountInput';
import { EmptyState } from '@/components/EmptyState';
import { ItemDiscountControl } from '@/components/ItemDiscountControl';
import { KeyboardAvoidingScreen } from '@/components/KeyboardAvoidingScreen';
import { LoadingView } from '@/components/LoadingView';
import { MaskedInput } from '@/components/MaskedInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { QuantityStepper } from '@/components/QuantityStepper';
import { SearchBar } from '@/components/SearchBar';
import { useToast } from '@/components/Toast';
import { useLicenseAccess } from '@/hooks/useLicenseAccess';
import { updateOrder } from '@/services/orderService';
import type { RootStackParamList } from '@/navigation/types';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/types/database';
import { cartItemLineTotal, cartItemSubtotal, type CartItem } from '@/types/orderDraft';
import { colors, radii, shadows, spacing } from '@/theme';
import { formatCurrencyBRL, parseDateBR } from '@/utils/masks';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderEdit'>;

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

const PAYMENT_ICONS: Record<PaymentMethod, keyof typeof Ionicons.glyphMap> = {
  dinheiro: 'cash-outline',
  pix: 'flash-outline',
  boleto: 'barcode-outline',
  cartao_credito: 'card-outline',
  cartao_debito: 'card-outline',
  a_prazo: 'time-outline',
};

// Inverso de maskDateBR/parseDateBR (que só convertem string -> Date) — usado aqui só pra
// pré-preencher o campo de data de entrega com o valor já salvo do pedido.
function dateToDigitsBR(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}${month}${year}`;
}

export function OrderEditScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const { showToast } = useToast();
  const { readOnly } = useLicenseAccess();

  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('');
  const [items, setItems] = useState<CartItem[]>([]);
  const [discountTotal, setDiscountTotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [notes, setNotes] = useState('');
  const [deliveryDateDigits, setDeliveryDateDigits] = useState('');
  const [deliveryDateError, setDeliveryDateError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Carrega o pedido uma única vez (não observável — a partir daqui é um rascunho local editado
  // na tela, só volta ao banco quando "Salvar alterações" é confirmado, mesmo espírito do
  // ClientFormScreen/ProductFormScreen ao editar um registro existente).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const order = await database.get<Order>('orders').find(orderId);
      const [client, orderItems] = await Promise.all([order.client.fetch(), order.items.fetch()]);
      if (cancelled) return;

      setClientName(client.name);
      setItems(
        orderItems.map((item) => ({
          productId: item.productId,
          productName: item.productNameSnapshot,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          discountValue: item.discountValue,
        }))
      );
      setDiscountTotal(order.discountTotal);
      setPaymentMethod(order.paymentMethod);
      setNotes(order.notes ?? '');
      setDeliveryDateDigits(order.deliveryDate ? dateToDigitsBR(order.deliveryDate) : '');
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    database.get<Category>('categories').query(Q.sortBy('name', Q.asc)).fetch().then(setCategories);
  }, []);

  useEffect(() => {
    if (!pickerVisible) return undefined;
    let cancelled = false;
    const trimmed = searchQuery.trim();
    const clauses = [];
    if (trimmed) clauses.push(Q.where('name', Q.like(`%${Q.sanitizeLikeString(trimmed)}%`)));
    if (selectedCategoryId) clauses.push(Q.where('category_id', selectedCategoryId));

    database
      .get<Product>('products')
      .query(...clauses, Q.sortBy('name', Q.asc))
      .fetch()
      .then((result) => {
        if (!cancelled) setProducts(result);
      });

    return () => {
      cancelled = true;
    };
  }, [pickerVisible, searchQuery, selectedCategoryId]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, item) => acc + cartItemLineTotal(item), 0);
    const itemsDiscountTotal = items.reduce((acc, item) => acc + item.discountValue, 0);
    const totalGross = items.reduce((acc, item) => acc + cartItemSubtotal(item), 0);
    return {
      subtotal,
      itemsDiscountTotal,
      totalGross,
      totalNet: Math.max(0, totalGross - discountTotal),
    };
  }, [items, discountTotal]);

  function addProduct(product: Product) {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) => (item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [
        ...current,
        { productId: product.id, productName: product.name, unitPrice: product.price, quantity: 1, discountValue: 0 },
      ];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    setItems((current) =>
      current.map((item) => {
        if (item.productId !== productId) return item;
        const newQty = Math.max(1, quantity);
        const lineTotal = item.unitPrice * newQty;
        return {
          ...item,
          quantity: newQty,
          discountValue: Math.min(item.discountValue, lineTotal),
        };
      })
    );
  }

  function updateDiscount(productId: string, discountValue: number) {
    setItems((current) =>
      current.map((item) => {
        if (item.productId !== productId) return item;
        const lineTotal = cartItemLineTotal(item);
        const clamped = Math.max(0, Math.min(discountValue, lineTotal));
        return { ...item, discountValue: clamped };
      })
    );
  }

  function removeItem(productId: string) {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }

  async function handleSave() {
    if (items.length === 0) {
      Alert.alert('Pedido sem itens', 'Adicione ao menos um item antes de salvar.');
      return;
    }

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
      await updateOrder(orderId, { items, discountTotal, paymentMethod, notes, deliveryDate });
      showToast('Pedido atualizado com sucesso!', 'success');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro ao salvar alterações', String(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingView message="Carregando pedido..." />;
  }

  return (
    <KeyboardAvoidingScreen style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Cliente</Text>
          <View style={styles.clientRow}>
            <Ionicons name="person-circle-outline" size={22} color={colors.accent} />
            <Text style={styles.clientName}>{clientName}</Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Itens</Text>
          {items.length === 0 ? (
            <Text style={styles.emptyItemsText}>Nenhum item — adicione ao menos um produto.</Text>
          ) : (
            items.map((item) => (
              <View key={item.productId} style={styles.itemRow}>
                <View style={styles.itemTopRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.productName}</Text>
                    <Text style={styles.itemDetail}>
                      {item.quantity} × {formatCurrencyBRL(item.unitPrice)} ={' '}
                      {formatCurrencyBRL(cartItemLineTotal(item))}
                    </Text>
                  </View>
                  <View style={styles.itemActions}>
                    <QuantityStepper value={item.quantity} onChange={(q) => updateQuantity(item.productId, q)} />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeItem(item.productId)}
                      accessibilityLabel={`Remover ${item.productName}`}
                      disabled={readOnly}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.itemBottomRow}>
                  <ItemDiscountControl
                    unitPrice={item.unitPrice}
                    quantity={item.quantity}
                    discountValue={item.discountValue}
                    onChangeDiscount={(cents) => updateDiscount(item.productId, cents)}
                    disabled={readOnly}
                  />
                  {item.discountValue > 0 ? (
                    <View style={styles.itemSubtotalPill}>
                      <Text style={styles.itemSubtotalLabel}>Subtotal: </Text>
                      <Text style={styles.itemSubtotalValue}>{formatCurrencyBRL(cartItemSubtotal(item))}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))
          )}

          <TouchableOpacity
            style={styles.addProductButton}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.8}
            disabled={readOnly}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
            <Text style={styles.addProductButtonText}>Adicionar produto</Text>
          </TouchableOpacity>
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
            {totals.itemsDiscountTotal > 0 ? (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total dos produtos</Text>
                  <Text style={styles.summaryValue}>{formatCurrencyBRL(totals.subtotal)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Desconto nos itens</Text>
                  <Text style={[styles.summaryValue, styles.discountValueText]}>
                    -{formatCurrencyBRL(totals.itemsDiscountTotal)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>{formatCurrencyBRL(totals.totalGross)}</Text>
                </View>
              </>
            ) : (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total dos itens</Text>
                <Text style={styles.summaryValue}>{formatCurrencyBRL(totals.totalGross)}</Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Desconto geral</Text>
              <Text style={styles.summaryValue}>-{formatCurrencyBRL(discountTotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total líquido</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrencyBRL(totals.totalNet)}</Text>
            </View>
          </View>
        </Card>

        {readOnly ? (
          <Text style={styles.readOnlyNotice}>Licença expirada — somente leitura, não é possível salvar.</Text>
        ) : null}

        <PrimaryButton
          label="Salvar alterações"
          icon="checkmark-circle-outline"
          onPress={handleSave}
          loading={saving}
          disabled={readOnly}
        />
      </ScrollView>

      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar produto</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} accessibilityLabel="Fechar">
                <Ionicons name="close" size={22} color={colors.slate500} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchArea}>
              <SearchBar placeholder="Buscar por nome" onDebouncedChange={setSearchQuery} />
              {categories.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                  <Chip
                    label="Todas"
                    selected={selectedCategoryId === null}
                    onPress={() => setSelectedCategoryId(null)}
                  />
                  {categories.map((category) => (
                    <Chip
                      key={category.id}
                      label={category.name}
                      selected={selectedCategoryId === category.id}
                      onPress={() => setSelectedCategoryId(category.id)}
                    />
                  ))}
                </ScrollView>
              ) : null}
            </View>

            <FlatList
              data={products}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.modalListContent}
              renderItem={({ item }) => {
                const cartItem = items.find((current) => current.productId === item.id);
                return (
                  <View style={styles.productRow}>
                    <View style={styles.productRowInfo}>
                      <Text style={styles.productRowName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.productRowPrice}>
                        {formatCurrencyBRL(item.price)} / {item.unit}
                      </Text>
                    </View>
                    {cartItem ? (
                      <QuantityStepper
                        value={cartItem.quantity}
                        min={0}
                        onChange={(q) => (q <= 0 ? removeItem(item.id) : updateQuantity(item.id, q))}
                      />
                    ) : (
                      <TouchableOpacity
                        onPress={() => addProduct(item)}
                        accessibilityLabel={`Adicionar ${item.name}`}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle" size={26} color={colors.accent} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
              ListEmptyComponent={<EmptyState icon="cube-outline" title="Nenhum produto encontrado" />}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingScreen>
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
  emptyItemsText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  itemRow: {
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.sm,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  itemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  itemSubtotalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate50,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radii.sm,
  },
  itemSubtotalLabel: {
    fontSize: 11.5,
    color: colors.slate500,
    fontWeight: '500',
  },
  itemSubtotalValue: {
    fontSize: 12.5,
    color: colors.textPrimary,
    fontWeight: '800',
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
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.dangerBgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 10,
    marginTop: spacing.xs,
  },
  addProductButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
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
  discountValueText: {
    color: colors.successStrong,
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
  readOnlyNotice: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.warningStrong,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '80%',
    paddingTop: spacing.sm,
    ...shadows.floating,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.slate200,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSearchArea: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  filterRow: {
    gap: spacing.xs,
  },
  modalListContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  productRowInfo: {
    flex: 1,
    gap: 2,
  },
  productRowName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  productRowPrice: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
});
