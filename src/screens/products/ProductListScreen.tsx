import { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { database } from '@/database';
import Product from '@/database/models/Product';
import Category from '@/database/models/Category';
import { Badge } from '@/components/Badge';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { SearchBar } from '@/components/SearchBar';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radii, shadows, spacing } from '@/theme';
import { formatCurrencyBRL } from '@/utils/masks';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductList'>;

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

function ProductListScreenBase({
  navigation,
  products,
  categories,
  onSearchChange,
  selectedCategoryId,
  onSelectCategory,
}: ListProps) {
  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <SearchBar placeholder="Buscar por nome" onDebouncedChange={onSearchChange} />
            </View>
            <TouchableOpacity
              style={styles.categoriesButton}
              onPress={() => navigation.navigate('CategoryList')}
              accessibilityLabel="Gerenciar categorias"
            >
              <Ionicons name="pricetags-outline" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>

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
                  <Text style={styles.cardSubtitle}>
                    {item.categoryId ? (categoryMap.get(item.categoryId) ?? 'Categoria removida') : 'Sem categoria'}
                  </Text>
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

const enhance = withObservables(
  ['searchQuery', 'selectedCategoryId'],
  ({ searchQuery, selectedCategoryId }: { searchQuery: string; selectedCategoryId: string | null }) => ({
    products: observeProducts(searchQuery, selectedCategoryId),
    categories: observeCategories(),
  })
);

const EnhancedProductList = enhance(ProductListScreenBase);

export function ProductListScreen({ navigation, route }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const onSearchChange = useCallback((value: string) => setSearchQuery(value), []);
  const onSelectCategory = useCallback((id: string | null) => setSelectedCategoryId(id), []);

  return (
    <EnhancedProductList
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
    maxWidth: 820,
    alignSelf: 'center',
  },
  searchContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInputWrap: {
    flex: 1,
  },
  categoriesButton: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
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
