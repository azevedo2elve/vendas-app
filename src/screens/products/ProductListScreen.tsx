import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { database } from '@/database';
import Product from '@/database/models/Product';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { SearchBar } from '@/components/SearchBar';
import type { RootStackParamList } from '@/navigation/types';
import { formatCurrencyBRL } from '@/utils/masks';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductList'>;

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

function ProductListScreenBase({ navigation, products, onSearchChange }: ListProps) {
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBar placeholder="Buscar por nome ou SKU" onDebouncedChange={onSearchChange} />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={products.length === 0 ? styles.emptyContent : styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ProductForm', { productId: item.id })}
          >
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>
                SKU: {item.sku} · Unidade: {item.unit}
              </Text>
            </View>
            <Text style={styles.cardPrice}>{formatCurrencyBRL(item.price)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            title="Nenhum produto encontrado"
            message="Toque no botão + para cadastrar o primeiro produto."
          />
        }
      />

      <Fab accessibilityLabel="Novo produto" onPress={() => navigation.navigate('ProductForm', undefined)} />
    </View>
  );
}

const enhance = withObservables(['searchQuery'], ({ searchQuery }: { searchQuery: string }) => ({
  products: observeProducts(searchQuery),
}));

const EnhancedProductList = enhance(ProductListScreenBase);

export function ProductListScreen({ navigation, route }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const onSearchChange = useCallback((value: string) => setSearchQuery(value), []);

  return (
    <EnhancedProductList
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
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
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
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#475569',
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16A34A',
  },
});
