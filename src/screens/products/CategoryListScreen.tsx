import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { database } from '@/database';
import Category from '@/database/models/Category';
import Product from '@/database/models/Product';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useToast } from '@/components/Toast';
import { createCategory, isCategoryNameTaken } from '@/services/categoryService';
import { useLicenseAccess } from '@/hooks/useLicenseAccess';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radii, shadows, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryList'>;

type RowProps = {
  category: Category;
};

function CategoryRow({ category }: RowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [saving, setSaving] = useState(false);
  const [productsCount, setProductsCount] = useState<number | null>(null);
  const { showToast } = useToast();
  const { readOnly } = useLicenseAccess();

  useEffect(() => {
    database
      .get<Product>('products')
      .query(Q.where('category_id', category.id))
      .fetchCount()
      .then(setProductsCount);
  }, [category.id]);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Nome inválido', 'Digite um nome para a categoria.');
      return;
    }
    setSaving(true);
    try {
      if (await isCategoryNameTaken(trimmed, category.id)) {
        Alert.alert('Categoria já existe', 'Já existe uma categoria cadastrada com esse nome.');
        return;
      }
      await database.write(async () => {
        await category.update((record) => {
          record.name = trimmed;
        });
      });
      setEditing(false);
      showToast('Categoria atualizada!', 'success');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const productsCount = await database
      .get<Product>('products')
      .query(Q.where('category_id', category.id))
      .fetchCount();

    if (productsCount > 0) {
      Alert.alert(
        'Não é possível excluir',
        `Existem ${productsCount} produto(s) usando essa categoria. Altere a categoria desses produtos antes de excluir.`
      );
      return;
    }

    Alert.alert('Excluir categoria', `Tem certeza que deseja excluir "${category.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await database.write(async () => {
            await category.markAsDeleted();
          });
          showToast('Categoria excluída.', 'info');
        },
      },
    ]);
  }

  if (editing) {
    return (
      <View style={styles.row}>
        <TextInput
          style={styles.editInput}
          value={name}
          onChangeText={setName}
          autoFocus
          placeholder="Nome da categoria"
          placeholderTextColor={colors.slate400}
        />
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel="Confirmar edição"
        >
          <Ionicons name="checkmark" size={20} color={colors.success} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            setName(category.name);
            setEditing(false);
          }}
          accessibilityLabel="Cancelar edição"
        >
          <Ionicons name="close" size={20} color={colors.slate500} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name="pricetag-outline" size={18} color={colors.accent} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>
          {category.name}
        </Text>
        <Text style={styles.rowCount}>
          {productsCount === null ? '...' : `${productsCount} produto(s)`}
        </Text>
      </View>
      {readOnly ? null : (
        <>
          <TouchableOpacity style={styles.iconButton} onPress={() => setEditing(true)} accessibilityLabel="Renomear categoria">
            <Ionicons name="pencil-outline" size={18} color={colors.slate600} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleDelete} accessibilityLabel="Excluir categoria">
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

type ListProps = Props & { categories: Category[] };

function CategoryListScreenBase({ categories }: ListProps) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const { showToast } = useToast();
  const { readOnly } = useLicenseAccess();

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setAdding(true);
    try {
      if (await isCategoryNameTaken(trimmed)) {
        Alert.alert('Categoria já existe', 'Já existe uma categoria cadastrada com esse nome.');
        return;
      }
      await createCategory(trimmed);
      setNewName('');
      showToast('Categoria criada!', 'success');
    } finally {
      setAdding(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {readOnly ? (
          <Text style={styles.readOnlyNotice}>Licença expirada — somente leitura, gestão de categorias indisponível.</Text>
        ) : (
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nova categoria (ex: Bebidas)"
              placeholderTextColor={colors.slate400}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <PrimaryButton label="Adicionar" onPress={handleAdd} loading={adding} disabled={!newName.trim()} style={styles.addButton} />
          </View>
        )}

        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={categories.length === 0 ? styles.emptyContent : styles.listContent}
          renderItem={({ item }) => <CategoryRow category={item} />}
          ListEmptyComponent={
            <EmptyState
              icon="pricetags-outline"
              title="Nenhuma categoria cadastrada"
              message="Crie a primeira categoria acima para organizar seu catálogo."
            />
          }
        />
      </View>
    </View>
  );
}

const enhance = withObservables([], () => ({
  categories: database.get<Category>('categories').query(Q.sortBy('name', Q.asc)).observe(),
}));

const EnhancedCategoryList = enhance(CategoryListScreenBase);

export function CategoryListScreen({ navigation, route }: Props) {
  return <EnhancedCategoryList navigation={navigation} route={route} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.xs,
  },
  readOnlyNotice: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.warningStrong,
    textAlign: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xs,
  },
  addInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  addButton: {
    paddingHorizontal: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  emptyContent: {
    flexGrow: 1,
  },
  row: {
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
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rowCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.textPrimary,
  },
});
