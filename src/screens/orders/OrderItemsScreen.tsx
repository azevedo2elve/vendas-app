import { useCallback, useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { database } from '@/database';
import Product from '@/database/models/Product';
import Category from '@/database/models/Category';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { OrderProgressBar } from '@/components/OrderProgressBar';
import { QuantityStepper } from '@/components/QuantityStepper';
import { SearchBar } from '@/components/SearchBar';
import { useOrderDraft } from '@/hooks/useOrderDraft';
import type { OrderDraftStackParamList } from '@/navigation/types';
import { colors, radii, shadows, spacing } from '@/theme';
import { formatCurrencyBRL } from '@/utils/masks';
import { cartItemLineTotal } from '@/types/orderDraft';

type Props = NativeStackScreenProps<OrderDraftStackParamList, 'OrderItems'>;

function observeProducts(searchQuery: string, categoryId: string | null) {
  const trimmed = searchQuery.trim();
  const clauses = [];

  if (trimmed) {
    clauses.push(Q.where('name', Q.like(`%${Q.sanitizeLikeString(trimmed)}%`)));
  }
  if (categoryId) {
    clauses.push(Q.where('category_id', categoryId));
  }

  return database
    .get<Product>('products')
    .query(...clauses, Q.sortBy('name', Q.asc))
    .observe();
}

function observeCategories() {
  return database.get<Category>('categories').query(Q.sortBy('name', Q.asc)).observe();
}

type ListProps = Props & {
  products: Product[];
  categories: Category[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
};

function OrderItemsScreenBase({
  navigation,
  products,
  categories,
  onSearchChange,
  selectedCategoryId,
  onSelectCategory,
}: ListProps) {
  const { clientName, items, totals, addProduct, updateQuantity, removeItem } = useOrderDraft();
  const [cartVisible, setCartVisible] = useState(false);
  const { width } = useWindowDimensions();
  const numColumns = width >= 760 ? 2 : 1;

  const cartByProductId = new Map(items.map((item) => [item.productId, item]));

  return (
    <View style={styles.container}>
      <OrderProgressBar step={2} />

      <View style={styles.content}>
        <FlatList
          key={numColumns}
          data={products}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.header}>
              {clientName ? (
                <View style={styles.clientPill}>
                  <Ionicons name="person" size={14} color={colors.accent} />
                  <Text style={styles.clientLabel}>{clientName}</Text>
                </View>
              ) : null}
              <Text style={styles.sectionTitle}>Catálogo de produtos</Text>
              <SearchBar placeholder="Buscar por nome" onDebouncedChange={onSearchChange} />
              {categories.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                  <Chip label="Todas" selected={selectedCategoryId === null} onPress={() => onSelectCategory(null)} />
                  {categories.map((category) => (
                    <Chip
                      key={category.id}
                      label={category.name}
                      selected={selectedCategoryId === category.id}
                      onPress={() => onSelectCategory(category.id)}
                    />
                  ))}
                </ScrollView>
              ) : null}
            </View>
          }
          renderItem={({ item }) => {
            const cartItem = cartByProductId.get(item.id);
            return (
              <View style={[styles.productCard, numColumns > 1 ? styles.productCardHalf : null]}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.productSubtitle}>{item.unit}</Text>
                  <Text style={styles.productPrice}>{formatCurrencyBRL(item.price)}</Text>
                </View>

                {cartItem ? (
                  <View style={styles.cardActions}>
                    <QuantityStepper value={cartItem.quantity} onChange={(q) => updateQuantity(item.id, q)} />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeItem(item.id)}
                      accessibilityLabel={`Remover ${item.name} do carrinho`}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addButton} onPress={() => addProduct(item)} activeOpacity={0.8}>
                    <Ionicons name="add" size={16} color={colors.white} />
                    <Text style={styles.addButtonText}>Adicionar</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListEmptyComponent={<EmptyState icon="cube-outline" title="Nenhum produto encontrado" />}
        />
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomBarSummary} onPress={() => setCartVisible(true)} activeOpacity={0.7}>
          <View style={styles.cartCountBadge}>
            <Text style={styles.cartCountText}>{totals.quantityTotal}</Text>
          </View>
          <View>
            <Text style={styles.bottomBarLabel}>
              {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'itens'} no carrinho
            </Text>
            <Text style={styles.bottomBarTotal}>{formatCurrencyBRL(totals.totalGross)}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.advanceButton, items.length === 0 ? styles.advanceButtonDisabled : null]}
          onPress={() => navigation.navigate('OrderReview')}
          disabled={items.length === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.advanceButtonText}>Avançar</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      <Modal visible={cartVisible} animationType="slide" transparent onRequestClose={() => setCartVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Carrinho</Text>
              <TouchableOpacity onPress={() => setCartVisible(false)} accessibilityLabel="Fechar carrinho">
                <Ionicons name="close" size={22} color={colors.slate500} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={items}
              keyExtractor={(item) => item.productId}
              contentContainerStyle={styles.modalListContent}
              renderItem={({ item }) => (
                <View style={styles.modalItem}>
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemName} numberOfLines={1}>
                      {item.productName}
                    </Text>
                    <Text style={styles.modalItemPrice}>
                      {formatCurrencyBRL(item.unitPrice)} × {item.quantity} ={' '}
                      {formatCurrencyBRL(cartItemLineTotal(item))}
                    </Text>
                  </View>
                  <QuantityStepper value={item.quantity} onChange={(q) => updateQuantity(item.productId, q)} />
                  <TouchableOpacity
                    style={styles.modalRemove}
                    onPress={() => removeItem(item.productId)}
                    accessibilityLabel={`Remover ${item.productName}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <EmptyState icon="cart-outline" title="Carrinho vazio" message="Toque em um produto para adicioná-lo." />
              }
            />

            <View style={styles.modalFooter}>
              <Text style={styles.modalFooterLabel}>Total geral</Text>
              <Text style={styles.modalFooterValue}>{formatCurrencyBRL(totals.totalGross)}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const enhance = withObservables(
  ['searchQuery', 'selectedCategoryId'],
  ({ searchQuery, selectedCategoryId }: { searchQuery: string; selectedCategoryId: string | null }) => ({
    products: observeProducts(searchQuery, selectedCategoryId),
    categories: observeCategories(),
  })
);

const EnhancedOrderItems = enhance(OrderItemsScreenBase);

export function OrderItemsScreen({ navigation, route }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const onSearchChange = useCallback((value: string) => setSearchQuery(value), []);
  const onSelectCategory = useCallback((id: string | null) => setSelectedCategoryId(id), []);

  return (
    <EnhancedOrderItems
      navigation={navigation}
      route={route}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      selectedCategoryId={selectedCategoryId}
      onSelectCategory={onSelectCategory}
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
    maxWidth: 960,
    alignSelf: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 140,
    gap: spacing.sm,
  },
  row: {
    gap: spacing.sm,
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  clientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.accentLight,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    marginTop: spacing.md,
  },
  clientLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.accentDark,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  filterRow: {
    gap: spacing.xs,
  },
  productCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.card,
  },
  productCardHalf: {
    maxWidth: '49%',
  },
  productInfo: {
    gap: 3,
  },
  productName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  productSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.accent,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.dangerBgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: 10,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...shadows.floating,
  },
  bottomBarSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  cartCountBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: colors.navy900,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cartCountText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  bottomBarLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  bottomBarTotal: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.success,
  },
  advanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
  },
  advanceButtonDisabled: {
    opacity: 0.4,
  },
  advanceButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
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
    maxHeight: '75%',
    paddingTop: spacing.sm,
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
  modalListContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalItemInfo: {
    flex: 1,
    gap: 2,
  },
  modalItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalItemPrice: {
    fontSize: 12,
    color: colors.textMuted,
  },
  modalRemove: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.dangerBgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalFooterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalFooterValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.success,
  },
});
