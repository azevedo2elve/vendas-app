import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { database } from '@/database';
import Product from '@/database/models/Product';
import { EmptyState } from '@/components/EmptyState';
import { SearchBar } from '@/components/SearchBar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { QuantityStepper } from '@/components/QuantityStepper';
import { DiscountInput } from '@/components/DiscountInput';
import { useOrderDraft } from '@/hooks/useOrderDraft';
import type { OrderDraftStackParamList } from '@/navigation/types';
import { formatCurrencyBRL } from '@/utils/masks';
import { cartItemLineTotal, cartItemSubtotal } from '@/types/orderDraft';

type Props = NativeStackScreenProps<OrderDraftStackParamList, 'OrderItems'>;

function observeProducts(searchQuery: string) {
  const trimmed = searchQuery.trim();

  if (!trimmed) {
    return database.get<Product>('products').query(Q.sortBy('name', Q.asc)).observe();
  }

  const like = `%${Q.sanitizeLikeString(trimmed)}%`;
  return database
    .get<Product>('products')
    .query(Q.or(Q.where('name', Q.like(like)), Q.where('sku', Q.like(like))), Q.sortBy('name', Q.asc))
    .observe();
}

type ListProps = Props & { products: Product[]; searchQuery: string; onSearchChange: (value: string) => void };

function OrderItemsScreenBase({ navigation, products, onSearchChange }: ListProps) {
  const { clientName, items, totals, addProduct, updateQuantity, updateDiscount, removeItem } = useOrderDraft();

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            {clientName ? <Text style={styles.clientLabel}>Cliente: {clientName}</Text> : null}

            <View style={styles.cartSection}>
              <Text style={styles.sectionTitle}>Carrinho</Text>
              {items.length === 0 ? (
                <Text style={styles.emptyCart}>Nenhum item adicionado ainda. Toque num produto abaixo.</Text>
              ) : (
                items.map((item) => (
                  <View key={item.productId} style={styles.cartItem}>
                    <View style={styles.cartItemHeader}>
                      <Text style={styles.cartItemName}>{item.productName}</Text>
                      <TouchableOpacity onPress={() => removeItem(item.productId)}>
                        <Text style={styles.removeText}>Remover</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cartItemPrice}>
                      {formatCurrencyBRL(item.unitPrice)} × {item.quantity} ={' '}
                      {formatCurrencyBRL(cartItemLineTotal(item))}
                    </Text>
                    <View style={styles.cartItemControls}>
                      <QuantityStepper
                        value={item.quantity}
                        onChange={(quantity) => updateQuantity(item.productId, quantity)}
                      />
                      <View style={styles.discountColumn}>
                        <DiscountInput
                          label="Desconto do item"
                          baseAmount={cartItemLineTotal(item)}
                          valueCents={item.discountValue}
                          onChange={(value) => updateDiscount(item.productId, value)}
                        />
                      </View>
                    </View>
                    <Text style={styles.cartItemSubtotal}>
                      Subtotal: {formatCurrencyBRL(cartItemSubtotal(item))}
                    </Text>
                  </View>
                ))
              )}

              <View style={styles.summary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total de itens</Text>
                  <Text style={styles.summaryValue}>{totals.quantityTotal}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>{formatCurrencyBRL(totals.subtotal)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total de descontos</Text>
                  <Text style={styles.summaryValue}>-{formatCurrencyBRL(totals.itemsDiscountTotal)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryTotalLabel}>Total geral</Text>
                  <Text style={styles.summaryTotalValue}>{formatCurrencyBRL(totals.totalGross)}</Text>
                </View>
              </View>

              <PrimaryButton
                label="Continuar"
                onPress={() => navigation.navigate('OrderReview')}
                disabled={items.length === 0}
              />
            </View>

            <View style={styles.searchContainer}>
              <Text style={styles.sectionTitle}>Produtos</Text>
              <SearchBar placeholder="Buscar por nome ou SKU" onDebouncedChange={onSearchChange} />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.productCard} onPress={() => addProduct(item)}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productSubtitle}>
                SKU: {item.sku} · {item.unit}
              </Text>
            </View>
            <Text style={styles.productPrice}>{formatCurrencyBRL(item.price)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState title="Nenhum produto encontrado" />}
      />
    </View>
  );
}

const enhance = withObservables(['searchQuery'], ({ searchQuery }: { searchQuery: string }) => ({
  products: observeProducts(searchQuery),
}));

const EnhancedOrderItems = enhance(OrderItemsScreenBase);

export function OrderItemsScreen({ navigation, route }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const onSearchChange = useCallback((value: string) => setSearchQuery(value), []);

  return (
    <EnhancedOrderItems
      navigation={navigation}
      route={route}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  header: {
    gap: 16,
    marginBottom: 8,
  },
  clientLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cartSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  emptyCart: {
    fontSize: 13,
    color: '#94A3B8',
  },
  cartItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    gap: 8,
  },
  cartItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  removeText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  cartItemPrice: {
    fontSize: 12,
    color: '#64748B',
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  discountColumn: {
    flex: 1,
  },
  cartItemSubtotal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
  },
  summary: {
    gap: 4,
    paddingTop: 4,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A34A',
  },
  searchContainer: {
    gap: 8,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  productSubtitle: {
    fontSize: 12,
    color: '#475569',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
});
