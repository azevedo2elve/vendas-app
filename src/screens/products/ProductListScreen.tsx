import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { database } from '@/database';
import Product from '@/database/models/Product';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { SearchBar } from '@/components/SearchBar';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radii, shadows, spacing } from '@/theme';
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
      <View style={styles.content}>
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
              activeOpacity={0.7}
            >
              <View style={styles.iconWrap}>
                <Ionicons name="cube-outline" size={22} color={colors.accent} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.cardSubtitle}>SKU: {item.sku}</Text>
                  <Badge label={item.unit} tone="neutral" />
                </View>
              </View>
              <Text style={styles.cardPrice}>{formatCurrencyBRL(item.price)}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="cube-outline"
              title="Nenhum produto encontrado"
              message="Toque no botão + para cadastrar o primeiro produto."
            />
          }
        />
      </View>

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
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
  },
  searchContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xs,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.card,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.success,
  },
});
