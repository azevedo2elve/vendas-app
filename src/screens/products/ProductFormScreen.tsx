import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Q } from '@nozbe/watermelondb';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { database } from '@/database';
import Product from '@/database/models/Product';
import Category from '@/database/models/Category';
import { Chip } from '@/components/Chip';
import { MaskedInput } from '@/components/MaskedInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LoadingView } from '@/components/LoadingView';
import { useToast } from '@/components/Toast';
import { createCategory, isCategoryNameTaken } from '@/services/categoryService';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radii, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductForm'>;

const UNITS = ['UN', 'KG', 'CX', 'L', 'PC'] as const;

const productSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto'),
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  price: z
    .string()
    .refine((value) => Number(value) > 0, 'Preço deve ser maior que zero'),
  unit: z.enum(UNITS),
});

type ProductFormValues = z.infer<typeof productSchema>;

export function ProductFormScreen({ navigation, route }: Props) {
  const productId = route.params?.productId;
  const isEditing = Boolean(productId);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const { showToast } = useToast();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', categoryId: '', price: '0', unit: 'UN' },
  });

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Editar produto' : 'Novo produto' });
  }, [navigation, isEditing]);

  const loadCategories = useCallback(async () => {
    const result = await database.get<Category>('categories').query(Q.sortBy('name', Q.asc)).fetch();
    setCategories(result);
    return result;
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories])
  );

  async function handleCreateCategory(onSelect: (categoryId: string) => void) {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    setCreatingCategory(true);
    try {
      if (await isCategoryNameTaken(trimmed)) {
        Alert.alert('Categoria já existe', 'Já existe uma categoria cadastrada com esse nome.');
        return;
      }
      const created = await createCategory(trimmed);
      await loadCategories();
      onSelect(created.id);
      setNewCategoryName('');
      setAddingCategory(false);
      showToast('Categoria criada!', 'success');
    } finally {
      setCreatingCategory(false);
    }
  }

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;

    database
      .get<Product>('products')
      .find(productId)
      .then((product) => {
        if (cancelled) return;
        reset({
          name: product.name,
          categoryId: product.categoryId ?? '',
          price: String(product.price),
          unit: (UNITS as readonly string[]).includes(product.unit) ? (product.unit as (typeof UNITS)[number]) : 'UN',
        });
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function onSubmit(values: ProductFormValues) {
    setSaving(true);
    try {
      const priceCents = Number(values.price);

      await database.write(async () => {
        if (productId) {
          const product = await database.get<Product>('products').find(productId);
          await product.update((record) => {
            record.name = values.name.trim();
            record.categoryId = values.categoryId;
            record.price = priceCents;
            record.unit = values.unit;
          });
        } else {
          await database.get<Product>('products').create((record) => {
            record.name = values.name.trim();
            record.categoryId = values.categoryId;
            record.price = priceCents;
            record.unit = values.unit;
          });
        }
      });

      showToast('Produto salvo com sucesso!', 'success');
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!productId) return;
    Alert.alert('Excluir produto', 'Tem certeza que deseja excluir este produto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const product = await database.get<Product>('products').find(productId);
          await database.write(async () => {
            await product.markAsDeleted();
          });
          showToast('Produto excluído.', 'info');
          navigation.goBack();
        },
      },
    ]);
  }

  if (loading) {
    return <LoadingView message="Carregando produto..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <MaskedInput
            label="Nome do produto"
            placeholder="Ex: Refrigerante 2L"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.name?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="price"
        render={({ field }) => (
          <MaskedInput
            label="Preço de venda"
            mask="currency"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.price?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="unit"
        render={({ field }) => (
          <View style={styles.unitContainer}>
            <Text style={styles.unitLabel}>Unidade de medida</Text>
            <View style={styles.unitChips}>
              {UNITS.map((unit) => (
                <Chip key={unit} label={unit} selected={field.value === unit} onPress={() => field.onChange(unit)} />
              ))}
            </View>
            {errors.unit ? <Text style={styles.errorText}>{errors.unit.message}</Text> : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="categoryId"
        render={({ field }) => (
          <View style={styles.unitContainer}>
            <View style={styles.categoryHeader}>
              <Text style={styles.unitLabel}>Categoria</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CategoryList')}>
                <Text style={styles.manageCategoriesLink}>Gerenciar categorias</Text>
              </TouchableOpacity>
            </View>

            {categories.length === 0 ? (
              <Text style={styles.helperText}>Nenhuma categoria cadastrada ainda — crie a primeira abaixo.</Text>
            ) : null}

            <View style={styles.unitChips}>
              {categories.map((category) => (
                <Chip
                  key={category.id}
                  label={category.name}
                  selected={field.value === category.id}
                  onPress={() => field.onChange(category.id)}
                />
              ))}
              <Chip
                label="Nova categoria"
                icon="add"
                selected={false}
                onPress={() => setAddingCategory((current) => !current)}
              />
            </View>

            {addingCategory ? (
              <View style={styles.addCategoryRow}>
                <MaskedInput
                  placeholder="Nome da nova categoria"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  style={styles.addCategoryInput}
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.addCategoryIconButton}
                  onPress={() => handleCreateCategory(field.onChange)}
                  disabled={creatingCategory}
                  accessibilityLabel="Confirmar nova categoria"
                >
                  <Ionicons name="checkmark" size={20} color={colors.success} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addCategoryIconButton}
                  onPress={() => {
                    setAddingCategory(false);
                    setNewCategoryName('');
                  }}
                  accessibilityLabel="Cancelar nova categoria"
                >
                  <Ionicons name="close" size={20} color={colors.slate500} />
                </TouchableOpacity>
              </View>
            ) : null}

            {errors.categoryId ? <Text style={styles.errorText}>{errors.categoryId.message}</Text> : null}
          </View>
        )}
      />

      <PrimaryButton label="Salvar" icon="checkmark-circle-outline" onPress={handleSubmit(onSubmit)} loading={saving} />

      {isEditing ? (
        <PrimaryButton
          label="Excluir produto"
          variant="danger"
          icon="trash-outline"
          onPress={handleDelete}
          style={styles.deleteButton}
        />
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
    padding: spacing.lg,
    gap: spacing.md,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  unitContainer: {
    gap: spacing.xs,
  },
  unitLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate700,
  },
  unitChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manageCategoriesLink: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.accent,
  },
  helperText: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
  addCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addCategoryInput: {
    flex: 1,
  },
  addCategoryIconButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
  },
  deleteButton: {
    marginTop: 4,
  },
});
