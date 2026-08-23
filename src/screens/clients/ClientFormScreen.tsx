import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Q } from '@nozbe/watermelondb';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { database } from '@/database';
import Client from '@/database/models/Client';
import { MaskedInput } from '@/components/MaskedInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LoadingView } from '@/components/LoadingView';
import type { RootStackParamList } from '@/navigation/types';
import { onlyDigits } from '@/utils/masks';
import { isValidCpfOuCnpj } from '@/utils/validators';

type Props = NativeStackScreenProps<RootStackParamList, 'ClientForm'>;

const clientSchema = z.object({
  name: z.string().trim().min(3, 'Nome muito curto'),
  document: z.string().refine(isValidCpfOuCnpj, 'CPF/CNPJ inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  address: z.string().trim().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

async function isDocumentTaken(document: string, ignoreId?: string): Promise<boolean> {
  const matches = await database.get<Client>('clients').query(Q.where('document', document)).fetch();
  return matches.some((client) => client.id !== ignoreId);
}

export function ClientFormScreen({ navigation, route }: Props) {
  const clientId = route.params?.clientId;
  const isEditing = Boolean(clientId);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: '', document: '', phone: '', address: '' },
  });

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Editar cliente' : 'Novo cliente' });
  }, [navigation, isEditing]);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    database
      .get<Client>('clients')
      .find(clientId)
      .then((client) => {
        if (cancelled) return;
        reset({
          name: client.name,
          document: client.document,
          phone: client.phone,
          address: client.address ?? '',
        });
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function onSubmit(values: ClientFormValues) {
    setSaving(true);
    try {
      const document = onlyDigits(values.document);

      if (await isDocumentTaken(document, clientId)) {
        setError('document', { message: 'Já existe um cliente cadastrado com esse CPF/CNPJ' });
        return;
      }

      await database.write(async () => {
        if (clientId) {
          const client = await database.get<Client>('clients').find(clientId);
          await client.update((record) => {
            record.name = values.name.trim();
            record.document = document;
            record.phone = onlyDigits(values.phone);
            record.address = values.address?.trim() || undefined;
          });
        } else {
          await database.get<Client>('clients').create((record) => {
            record.name = values.name.trim();
            record.document = document;
            record.phone = onlyDigits(values.phone);
            record.address = values.address?.trim() || undefined;
          });
        }
      });

      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!clientId) return;
    Alert.alert('Excluir cliente', 'Tem certeza que deseja excluir este cliente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const client = await database.get<Client>('clients').find(clientId);
          await database.write(async () => {
            await client.markAsDeleted();
          });
          navigation.goBack();
        },
      },
    ]);
  }

  if (loading) {
    return <LoadingView message="Carregando cliente..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <MaskedInput
            label="Nome / Razão social"
            placeholder="Nome completo ou razão social"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.name?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="document"
        render={({ field }) => (
          <MaskedInput
            label="CPF / CNPJ"
            mask="cpfCnpj"
            placeholder="000.000.000-00"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.document?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <MaskedInput
            label="Telefone / WhatsApp"
            mask="phone"
            placeholder="(00) 00000-0000"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.phone?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="address"
        render={({ field }) => (
          <MaskedInput
            label="Endereço"
            placeholder="Rua, número, bairro, cidade - UF"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            error={errors.address?.message}
            multiline
          />
        )}
      />

      <PrimaryButton label="Salvar" onPress={handleSubmit(onSubmit)} loading={saving} />

      {isEditing ? (
        <PrimaryButton label="Excluir cliente" variant="danger" onPress={handleDelete} style={styles.deleteButton} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  deleteButton: {
    marginTop: 4,
  },
});
