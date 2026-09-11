import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import { Q } from '@nozbe/watermelondb';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { database } from '@/database';
import Client from '@/database/models/Client';
import { MaskedInput } from '@/components/MaskedInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LoadingView } from '@/components/LoadingView';
import { useToast } from '@/components/Toast';
import { useLicenseAccess } from '@/hooks/useLicenseAccess';
import type { RootStackParamList } from '@/navigation/types';
import { colors, spacing } from '@/theme';
import { lookupCep } from '@/services/cepLookupService';
import { lookupCnpj } from '@/services/cnpjLookupService';
import { onlyDigits } from '@/utils/masks';
import { isValidCNPJ, isValidCpfOuCnpj } from '@/utils/validators';

type Props = NativeStackScreenProps<RootStackParamList, 'ClientForm'>;

const clientSchema = z.object({
  name: z.string().trim().min(3, 'Nome muito curto'),
  document: z.string().refine(isValidCpfOuCnpj, 'CPF/CNPJ inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  addressStreet: z.string().trim().optional(),
  addressNumber: z.string().trim().optional(),
  addressComplement: z.string().trim().optional(),
  addressCity: z.string().trim().optional(),
  addressState: z.string().trim().max(2, 'Use a sigla (UF)').optional(),
  addressZip: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

const EMPTY_FORM: ClientFormValues = {
  name: '',
  document: '',
  phone: '',
  addressStreet: '',
  addressNumber: '',
  addressComplement: '',
  addressCity: '',
  addressState: '',
  addressZip: '',
};

async function isDocumentTaken(document: string, ignoreId?: string): Promise<boolean> {
  const matches = await database.get<Client>('clients').query(Q.where('document', document)).fetch();
  return matches.some((client) => client.id !== ignoreId);
}

export function ClientFormScreen({ navigation, route }: Props) {
  const clientId = route.params?.clientId;
  const isEditing = Boolean(clientId);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const { readOnly } = useLicenseAccess();

  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false);
  const [cepLookupLoading, setCepLookupLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: EMPTY_FORM,
  });

  const documentValue = useWatch({ control, name: 'document' });
  const zipValue = useWatch({ control, name: 'addressZip' });
  const canLookupCnpj = isValidCNPJ(documentValue);
  const canLookupCep = onlyDigits(zipValue ?? '').length === 8;

  async function handleLookupCnpj() {
    setCnpjLookupLoading(true);
    try {
      const result = await lookupCnpj(getValues('document'));
      if (!result) {
        showToast('Não foi possível buscar o CNPJ agora. Preencha manualmente.', 'info');
        return;
      }
      if (result.name) setValue('name', result.name);
      if (result.phone.length >= 10) setValue('phone', result.phone);
      if (result.addressStreet) setValue('addressStreet', result.addressStreet);
      if (result.addressNumber) setValue('addressNumber', result.addressNumber);
      if (result.addressComplement) setValue('addressComplement', result.addressComplement);
      if (result.addressCity) setValue('addressCity', result.addressCity);
      if (result.addressState) setValue('addressState', result.addressState);
      if (result.addressZip) setValue('addressZip', result.addressZip);
      showToast('Dados da empresa preenchidos.', 'success');
    } finally {
      setCnpjLookupLoading(false);
    }
  }

  async function handleLookupCep() {
    setCepLookupLoading(true);
    try {
      const result = await lookupCep(getValues('addressZip') ?? '');
      if (!result) {
        showToast('Não foi possível buscar o CEP agora. Preencha manualmente.', 'info');
        return;
      }
      if (result.street) setValue('addressStreet', result.street);
      if (result.city) setValue('addressCity', result.city);
      if (result.state) setValue('addressState', result.state);
      showToast('Endereço preenchido.', 'success');
    } finally {
      setCepLookupLoading(false);
    }
  }

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
          addressStreet: client.addressStreet ?? '',
          addressNumber: client.addressNumber ?? '',
          addressComplement: client.addressComplement ?? '',
          addressCity: client.addressCity ?? '',
          addressState: client.addressState ?? '',
          addressZip: client.addressZip ?? '',
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
            record.addressStreet = values.addressStreet?.trim() || undefined;
            record.addressNumber = values.addressNumber?.trim() || undefined;
            record.addressComplement = values.addressComplement?.trim() || undefined;
            record.addressCity = values.addressCity?.trim() || undefined;
            record.addressState = values.addressState?.trim().toUpperCase() || undefined;
            record.addressZip = onlyDigits(values.addressZip ?? '') || undefined;
          });
        } else {
          await database.get<Client>('clients').create((record) => {
            record.name = values.name.trim();
            record.document = document;
            record.phone = onlyDigits(values.phone);
            record.addressStreet = values.addressStreet?.trim() || undefined;
            record.addressNumber = values.addressNumber?.trim() || undefined;
            record.addressComplement = values.addressComplement?.trim() || undefined;
            record.addressCity = values.addressCity?.trim() || undefined;
            record.addressState = values.addressState?.trim().toUpperCase() || undefined;
            record.addressZip = onlyDigits(values.addressZip ?? '') || undefined;
          });
        }
      });

      showToast('Cliente salvo com sucesso!', 'success');
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
          showToast('Cliente excluído.', 'info');
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

      {canLookupCnpj ? (
        <TouchableOpacity style={styles.lookupLink} onPress={handleLookupCnpj} disabled={cnpjLookupLoading}>
          {cnpjLookupLoading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="search-outline" size={16} color={colors.accent} />
          )}
          <Text style={styles.lookupLinkText}>Buscar dados da empresa pelo CNPJ</Text>
        </TouchableOpacity>
      ) : null}

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

      <Text style={styles.sectionLabel}>Endereço</Text>

      <Controller
        control={control}
        name="addressStreet"
        render={({ field }) => (
          <MaskedInput
            label="Rua / Logradouro"
            placeholder="Rua, avenida..."
            value={field.value ?? ''}
            onChangeText={field.onChange}
          />
        )}
      />

      <View style={styles.formRow}>
        <View style={styles.formRowItem}>
          <Controller
            control={control}
            name="addressNumber"
            render={({ field }) => (
              <MaskedInput label="Número" value={field.value ?? ''} onChangeText={field.onChange} />
            )}
          />
        </View>
        <View style={styles.formRowItemWide}>
          <Controller
            control={control}
            name="addressComplement"
            render={({ field }) => (
              <MaskedInput
                label="Complemento"
                placeholder="Opcional"
                value={field.value ?? ''}
                onChangeText={field.onChange}
              />
            )}
          />
        </View>
      </View>

      <View style={styles.formRow}>
        <View style={styles.formRowItemWide}>
          <Controller
            control={control}
            name="addressCity"
            render={({ field }) => (
              <MaskedInput label="Cidade" value={field.value ?? ''} onChangeText={field.onChange} />
            )}
          />
        </View>
        <View style={styles.formRowItem}>
          <Controller
            control={control}
            name="addressState"
            render={({ field }) => (
              <MaskedInput
                label="UF"
                placeholder="SP"
                autoCapitalize="characters"
                maxLength={2}
                value={field.value ?? ''}
                onChangeText={field.onChange}
                error={errors.addressState?.message}
              />
            )}
          />
        </View>
      </View>

      <Controller
        control={control}
        name="addressZip"
        render={({ field }) => (
          <MaskedInput
            label="CEP"
            mask="cep"
            placeholder="00000-000"
            value={field.value ?? ''}
            onChangeText={field.onChange}
          />
        )}
      />

      {canLookupCep ? (
        <TouchableOpacity style={styles.lookupLink} onPress={handleLookupCep} disabled={cepLookupLoading}>
          {cepLookupLoading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="search-outline" size={16} color={colors.accent} />
          )}
          <Text style={styles.lookupLinkText}>Buscar endereço pelo CEP</Text>
        </TouchableOpacity>
      ) : null}

      {readOnly ? (
        <Text style={styles.readOnlyNotice}>Licença expirada — somente leitura, não é possível salvar.</Text>
      ) : null}

      <PrimaryButton
        label="Salvar"
        icon="checkmark-circle-outline"
        onPress={handleSubmit(onSubmit)}
        loading={saving}
        disabled={readOnly}
      />

      {isEditing ? (
        <PrimaryButton
          label="Excluir cliente"
          variant="danger"
          icon="trash-outline"
          onPress={handleDelete}
          disabled={readOnly}
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  formRowItem: {
    flex: 1,
  },
  formRowItemWide: {
    flex: 2,
  },
  lookupLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: -4,
  },
  lookupLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  deleteButton: {
    marginTop: 4,
  },
  readOnlyNotice: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.warningStrong,
    textAlign: 'center',
  },
});
