import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Q } from '@nozbe/watermelondb';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { database } from '@/database';
import Product from '@/database/models/Product';
import { Chip } from '@/components/Chip';
import { MaskedInput } from '@/components/MaskedInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LoadingView } from '@/components/LoadingView';
import { useToast } from '@/components/Toast';
import type { RootStackParamList } from '@/navigation/types';
import { colors, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductForm'>;

const UNITS = ['UN', 'KG', 'CX', 'L', 'PC'] as const;

const productSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto'),
  sku: z.string().trim().min(1, 'SKU obrigatório'),
  price: z
    .string()
    .refine((value) => Number(value) > 0, 'Preço deve ser maior que zero'),
  unit: z.enum(UNITS),
});

type ProductFormValues = z.infer<typeof productSchema>;

async function isSkuTaken(sku: string, ignoreId?: string): Promise<boolean> {
  const matches = await database.get<Product>('products').query(Q.where('sku', sku)).fetch();
  return matches.some((product) => product.id !== ignoreId);
}

export function ProductFormScreen({ navigation, route }: Props) {
  const productId = route.params?.productId;
  const isEditing = Boolean(productId);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', sku: '', price: '0', unit: 'UN' },
  });

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Editar produto' : 'Novo produto' });
  }, [navigation, isEditing]);

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
          sku: product.sku,
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
      const sku = values.sku.trim();

      if (await isSkuTaken(sku, productId)) {
        setError('sku', { message: 'Já existe um produto cadastrado com esse SKU' });
        return;
      }

      const priceCents = Number(values.price);

      await database.write(async () => {
        if (productId) {
          const product = await database.get<Product>('products').find(productId);
          await product.update((record) => {
            record.name = values.name.trim();
            record.sku = sku;
            record.price = priceCents;
            record.unit = values.unit;
          });
        } else {
          await database.get<Product>('products').create((record) => {
            record.name = values.name.trim();
            record.sku = sku;
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
        name="sku"
        render={({ field }) => (
          <MaskedInput
            label="Código / SKU"
            placeholder="Ex: REF-2L-001"
            autoCapitalize="characters"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.sku?.message}
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
  errorText: {
    fontSize: 12,
    color: colors.danger,
  },
  deleteButton: {
    marginTop: 4,
  },
});
