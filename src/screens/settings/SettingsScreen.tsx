import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useNetInfo } from '@react-native-community/netinfo';
import { Badge } from '@/components/Badge';
import { CollapsibleCard } from '@/components/CollapsibleCard';
import { LoadingView } from '@/components/LoadingView';
import { MaskedInput } from '@/components/MaskedInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useToast } from '@/components/Toast';
import { isSupportEmailConfigured, isSupportPhoneConfigured, SUPPORT_WHATSAPP_PHONE } from '@/services/api';
import { emailBackup, exportBackup } from '@/services/backupService';
import { evaluateLicense, getCurrentLicenseSnapshot } from '@/services/licenseService';
import { clearAllOrders } from '@/services/orderService';
import { useLicenseAccess } from '@/hooks/useLicenseAccess';
import {
  getDatabaseSummary,
  getOrCreateCompanySettings,
  pickCompanyLogo,
  saveCompanySettings,
  type DatabaseSummary,
} from '@/services/settingsService';
import type { RootStackParamList } from '@/navigation/types';
import { LICENSE_STATUS_LABELS, LICENSE_STATUS_TONE, type LicenseStatus } from '@/types/database';
import { colors, radii, shadows, spacing } from '@/theme';
import { APP_VERSION } from '@/utils/appInfo';
import { onlyDigits } from '@/utils/masks';
import { isValidCpfOuCnpj } from '@/utils/validators';
import { openWhatsApp } from '@/utils/whatsapp';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const companySchema = z.object({
  razaoSocial: z.string().trim().min(3, 'Nome/razão social muito curto'),
  nomeFantasia: z.string().trim().optional(),
  vendedorNome: z.string().trim().optional(),
  document: z.string().refine((value) => value.length === 0 || isValidCpfOuCnpj(value), 'CNPJ/CPF inválido'),
  ie: z.string().trim().optional(),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().trim().email('E-mail inválido').optional().or(z.literal('')),
  addressStreet: z.string().trim().optional(),
  addressNumber: z.string().trim().optional(),
  addressDistrict: z.string().trim().optional(),
  addressCity: z.string().trim().optional(),
  addressState: z.string().trim().max(2, 'Use a sigla (UF)').optional(),
  addressZip: z.string().optional(),
  pixKey: z.string().trim().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

const EMPTY_COMPANY_FORM: CompanyFormValues = {
  razaoSocial: '',
  nomeFantasia: '',
  vendedorNome: '',
  document: '',
  ie: '',
  phone: '',
  email: '',
  addressStreet: '',
  addressNumber: '',
  addressDistrict: '',
  addressCity: '',
  addressState: '',
  addressZip: '',
  pixKey: '',
};

type LicenseSnapshot = { status: LicenseStatus; expiresAt: Date; deviceId: string };

export function SettingsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [license, setLicense] = useState<LicenseSnapshot | null>(null);
  const [checkingLicense, setCheckingLicense] = useState(false);
  const [summary, setSummary] = useState<DatabaseSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sendingBackupEmail, setSendingBackupEmail] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClearVisible, setConfirmClearVisible] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'company' | 'system' | 'data' | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [pickingLogo, setPickingLogo] = useState(false);
  const { showToast } = useToast();
  const netInfo = useNetInfo();
  const { readOnly } = useLicenseAccess();

  function toggleSection(section: 'company' | 'system' | 'data') {
    setExpandedSection((current) => (current === section ? null : section));
  }

  const {
    control,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: EMPTY_COMPANY_FORM,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [settings, licenseSnapshot] = await Promise.all([getOrCreateCompanySettings(), getCurrentLicenseSnapshot()]);
      if (cancelled) return;
      reset({
        razaoSocial: settings.razaoSocial,
        nomeFantasia: settings.nomeFantasia ?? '',
        vendedorNome: settings.vendedorNome ?? '',
        document: settings.document,
        ie: settings.ie ?? '',
        phone: settings.phone,
        email: settings.email ?? '',
        addressStreet: settings.addressStreet ?? '',
        addressNumber: settings.addressNumber ?? '',
        addressDistrict: settings.addressDistrict ?? '',
        addressCity: settings.addressCity ?? '',
        addressState: settings.addressState ?? '',
        addressZip: settings.addressZip ?? '',
        pixKey: settings.pixKey ?? '',
      });
      setLogoBase64(settings.logoBase64 ?? null);
      setLicense(licenseSnapshot);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshSummary = useCallback(async () => {
    const result = await getDatabaseSummary();
    setSummary(result);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshSummary();
    }, [refreshSummary])
  );

  function companySettingsInputFromForm(values: CompanyFormValues) {
    return {
      razaoSocial: values.razaoSocial,
      nomeFantasia: values.nomeFantasia,
      vendedorNome: values.vendedorNome,
      document: onlyDigits(values.document ?? ''),
      ie: values.ie,
      phone: onlyDigits(values.phone),
      email: values.email,
      addressStreet: values.addressStreet,
      addressNumber: values.addressNumber,
      addressDistrict: values.addressDistrict,
      addressCity: values.addressCity,
      addressState: values.addressState?.toUpperCase(),
      addressZip: onlyDigits(values.addressZip ?? ''),
      pixKey: values.pixKey,
    };
  }

  async function onSubmitCompany(values: CompanyFormValues) {
    setSaving(true);
    try {
      await saveCompanySettings(companySettingsInputFromForm(values));
      showToast('Dados da empresa salvos com sucesso!', 'success');
    } finally {
      setSaving(false);
    }
  }

  async function handlePickLogo() {
    setPickingLogo(true);
    try {
      const dataUri = await pickCompanyLogo();
      if (!dataUri) return;
      await saveCompanySettings({ ...companySettingsInputFromForm(getValues()), logoBase64: dataUri });
      setLogoBase64(dataUri);
      showToast('Logo atualizada com sucesso!', 'success');
    } catch (error) {
      Alert.alert('Não foi possível definir a logo', String(error instanceof Error ? error.message : error));
    } finally {
      setPickingLogo(false);
    }
  }

  function handleRemoveLogo() {
    Alert.alert('Remover logo', 'Tem certeza que deseja remover a logo da empresa?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await saveCompanySettings({ ...companySettingsInputFromForm(getValues()), logoBase64: null });
          setLogoBase64(null);
          showToast('Logo removida.', 'info');
        },
      },
    ]);
  }

  async function handleCopyDeviceId() {
    if (!license) return;
    await Clipboard.setStringAsync(license.deviceId);
    setCopied(true);
    showToast('ID copiado para a área de transferência!', 'success');
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSendDeviceIdViaWhatsApp() {
    if (!license || !SUPPORT_WHATSAPP_PHONE) return;
    const message = `Olá! Preciso liberar a licença do meu dispositivo no Força de Vendas.\nID do dispositivo: ${license.deviceId}`;
    await openWhatsApp(SUPPORT_WHATSAPP_PHONE, message);
  }

  async function handleCheckLicense() {
    setCheckingLicense(true);
    try {
      await evaluateLicense();
      const snapshot = await getCurrentLicenseSnapshot();
      setLicense(snapshot);
      if (snapshot.status === 'active') {
        showToast('Licença verificada: está ativa!', 'success');
      } else {
        showToast(`Licença ${LICENSE_STATUS_LABELS[snapshot.status].toLowerCase()}.`, 'error');
      }
    } catch (error) {
      showToast(`Não foi possível verificar a licença: ${String(error)}`, 'error');
    } finally {
      setCheckingLicense(false);
    }
  }

  async function handleExportBackup() {
    setExporting(true);
    try {
      const result = await exportBackup();
      showToast(
        `Backup gerado com ${result.clientsCount} cliente(s), ${result.productsCount} produto(s) e ${result.ordersCount} pedido(s).`,
        'success'
      );
    } catch (error) {
      showToast(`Não foi possível exportar o backup: ${String(error)}`, 'error');
    } finally {
      setExporting(false);
    }
  }

  async function handleEmailBackup() {
    setSendingBackupEmail(true);
    try {
      const result = await emailBackup();
      if (result.status === 'cancelled') return;
      showToast(
        `Backup enviado com ${result.clientsCount} cliente(s), ${result.productsCount} produto(s) e ${result.ordersCount} pedido(s).`,
        'success'
      );
    } catch (error) {
      showToast(`Não foi possível enviar o backup por e-mail: ${String(error)}`, 'error');
    } finally {
      setSendingBackupEmail(false);
    }
  }

  async function handleConfirmClearOrders() {
    setClearing(true);
    try {
      const removed = await clearAllOrders();
      showToast(`${removed} pedido(s) removido(s).`, 'success');
      setConfirmClearVisible(false);
      await refreshSummary();
    } catch (error) {
      showToast(`Não foi possível limpar os pedidos: ${String(error)}`, 'error');
    } finally {
      setClearing(false);
    }
  }

  if (loading || !license) {
    return <LoadingView message="Carregando configurações..." />;
  }

  const isOnline = netInfo.isConnected !== false;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Seção 1 — Dados da Empresa / Vendedor */}
      <CollapsibleCard
        icon="business-outline"
        iconColor={colors.accent}
        iconBackground={colors.accentLight}
        title="Dados da Empresa / Vendedor"
        subtitle="Usados no cabeçalho das ordens de venda em PDF"
        expanded={expandedSection === 'company'}
        onToggle={() => toggleSection('company')}
      >

        <Controller
          control={control}
          name="razaoSocial"
          render={({ field }) => (
            <MaskedInput
              label="Razão Social / Nome Completo"
              placeholder="Ex: João da Silva Comércio LTDA"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.razaoSocial?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="nomeFantasia"
          render={({ field }) => (
            <MaskedInput
              label="Nome Fantasia"
              placeholder="Nome usado no dia a dia (opcional)"
              value={field.value ?? ''}
              onChangeText={field.onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="vendedorNome"
          render={({ field }) => (
            <MaskedInput
              label="Nome do Vendedor"
              placeholder="Exibido na tela inicial e no PDF (opcional)"
              value={field.value ?? ''}
              onChangeText={field.onChange}
            />
          )}
        />

        <View>
          <Text style={styles.sectionLabel}>Logo da Empresa</Text>
          <View style={styles.logoRow}>
            {logoBase64 ? (
              <Image source={{ uri: logoBase64 }} style={styles.logoPreview} resizeMode="contain" />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="image-outline" size={22} color={colors.slate400} />
              </View>
            )}
            <View style={styles.logoActions}>
              <PrimaryButton
                label={logoBase64 ? 'Trocar logo' : 'Selecionar logo'}
                variant="outline"
                icon="cloud-upload-outline"
                onPress={handlePickLogo}
                loading={pickingLogo}
                disabled={readOnly}
              />
              {logoBase64 ? (
                <PrimaryButton
                  label="Remover"
                  variant="danger"
                  icon="trash-outline"
                  onPress={handleRemoveLogo}
                  disabled={readOnly}
                />
              ) : null}
            </View>
          </View>
          <Text style={styles.helperText}>PNG ou JPG, até 2MB. Usada no cabeçalho do PDF da ordem de venda.</Text>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formRowItemWide}>
            <Controller
              control={control}
              name="document"
              render={({ field }) => (
                <MaskedInput
                  label="CNPJ ou CPF"
                  mask="cpfCnpj"
                  placeholder="000.000.000-00"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.document?.message}
                />
              )}
            />
          </View>
          <View style={styles.formRowItem}>
            <Controller
              control={control}
              name="ie"
              render={({ field }) => (
                <MaskedInput
                  label="I.E. / I.M."
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
          </View>
          <View style={styles.formRowItemWide}>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <MaskedInput
                  label="E-mail Comercial"
                  placeholder="contato@empresa.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  error={errors.email?.message}
                />
              )}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Endereço</Text>

        <Controller
          control={control}
          name="addressStreet"
          render={({ field }) => (
            <MaskedInput
              label="Logradouro"
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
              name="addressDistrict"
              render={({ field }) => (
                <MaskedInput label="Bairro" value={field.value ?? ''} onChangeText={field.onChange} />
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
            <MaskedInput label="CEP" mask="cep" placeholder="00000-000" value={field.value ?? ''} onChangeText={field.onChange} />
          )}
        />

        <Controller
          control={control}
          name="pixKey"
          render={({ field }) => (
            <MaskedInput
              label="Chave PIX Padrão"
              placeholder="CPF/CNPJ, e-mail, telefone ou chave aleatória"
              value={field.value ?? ''}
              onChangeText={field.onChange}
            />
          )}
        />

        <PrimaryButton
          label="Salvar Dados da Empresa"
          icon="checkmark-circle-outline"
          onPress={handleSubmit(onSubmitCompany)}
          loading={saving}
          disabled={readOnly}
        />
      </CollapsibleCard>

      {/* Seção 2 — Sistema e Sobre */}
      <CollapsibleCard
        icon="information-circle-outline"
        iconColor={colors.slate600}
        iconBackground={colors.slate100}
        title="Sistema e Sobre"
        expanded={expandedSection === 'system'}
        onToggle={() => toggleSection('system')}
      >

        <View>
          <Text style={styles.sectionLabel}>ID do Dispositivo</Text>
          <View style={styles.deviceIdBox}>
            <Text style={styles.deviceIdText} selectable numberOfLines={2}>
              {license.deviceId}
            </Text>
          </View>
          <View style={styles.formRow}>
            <View style={styles.formRowItemWide}>
              <PrimaryButton
                label={copied ? 'ID copiado!' : 'Copiar ID'}
                variant="outline"
                icon={copied ? 'checkmark' : 'copy-outline'}
                onPress={handleCopyDeviceId}
              />
            </View>
            <View style={styles.formRowItemWide}>
              <PrimaryButton
                label="Enviar por WhatsApp"
                variant="outline"
                icon="logo-whatsapp"
                onPress={handleSendDeviceIdViaWhatsApp}
                disabled={!isSupportPhoneConfigured()}
              />
            </View>
          </View>
          {!isSupportPhoneConfigured() ? (
            <Text style={styles.helperText}>
              Suporte via WhatsApp não configurado (defina EXPO_PUBLIC_SUPPORT_WHATSAPP_PHONE no .env).
            </Text>
          ) : null}
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoRowLeft}>
            <Ionicons name={isOnline ? 'wifi' : 'cloud-offline-outline'} size={16} color={colors.slate500} />
            <Text style={styles.infoLabel}>Conexão</Text>
          </View>
          <Badge
            label={isOnline ? 'Online' : 'Modo Offline'}
            tone={isOnline ? 'success' : 'warning'}
            dot
          />
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoRowLeft}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.slate500} />
            <Text style={styles.infoLabel}>Licença</Text>
          </View>
          <View style={styles.infoRowRight}>
            <Text style={styles.infoValue}>até {license.expiresAt.toLocaleDateString('pt-BR')}</Text>
            <Badge label={LICENSE_STATUS_LABELS[license.status]} tone={LICENSE_STATUS_TONE[license.status]} />
          </View>
        </View>

        <PrimaryButton
          label="Verificar Licença Agora"
          variant="outline"
          icon="refresh"
          onPress={handleCheckLicense}
          loading={checkingLicense}
        />

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoRowLeft}>
            <Ionicons name="phone-portrait-outline" size={16} color={colors.slate500} />
            <Text style={styles.infoLabel}>Versão do aplicativo</Text>
          </View>
          <Text style={styles.infoValue}>v{APP_VERSION}</Text>
        </View>
      </CollapsibleCard>

      {/* Seção 3 — Dados, Backup e Armazenamento */}
      <CollapsibleCard
        icon="server-outline"
        iconColor={colors.success}
        iconBackground={colors.successBgSoft}
        title="Dados, Backup e Armazenamento"
        expanded={expandedSection === 'data'}
        onToggle={() => toggleSection('data')}
      >

        {summary ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.clientsCount}</Text>
              <Text style={styles.summaryLabel}>Clientes</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.productsCount}</Text>
              <Text style={styles.summaryLabel}>Produtos</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.ordersCount}</Text>
              <Text style={styles.summaryLabel}>Ordens de Venda</Text>
            </View>
          </View>
        ) : null}

        <PrimaryButton
          label="Exportar Backup (JSON)"
          icon="cloud-upload-outline"
          onPress={handleExportBackup}
          loading={exporting}
        />
        <PrimaryButton
          label="Importar / Restaurar Backup"
          variant="outline"
          icon="cloud-download-outline"
          onPress={() => navigation.navigate('Backup')}
        />
        <PrimaryButton
          label="Enviar backup por e-mail (suporte)"
          variant="outline"
          icon="mail-outline"
          onPress={handleEmailBackup}
          loading={sendingBackupEmail}
          disabled={!isSupportEmailConfigured()}
        />
        {!isSupportEmailConfigured() ? (
          <Text style={styles.helperText}>
            Envio de backup por e-mail não configurado (defina EXPO_PUBLIC_SUPPORT_EMAIL no .env).
          </Text>
        ) : (
          <Text style={styles.helperText}>
            Use quando precisar de ajuda do suporte: abre seu app de e-mail com o backup anexado, pronto pra enviar.
          </Text>
        )}

        <View style={styles.divider} />

        <Text style={styles.dangerZoneTitle}>Zona de perigo</Text>
        <PrimaryButton
          label="Limpar Pedidos de Teste"
          variant="danger"
          icon="trash-outline"
          onPress={() => setConfirmClearVisible(true)}
          disabled={readOnly}
        />
      </CollapsibleCard>

      <Modal visible={confirmClearVisible} transparent animationType="fade" onRequestClose={() => setConfirmClearVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="warning" size={28} color={colors.danger} />
            </View>
            <Text style={styles.modalTitle}>Limpar todos os pedidos?</Text>
            <Text style={styles.modalMessage}>
              Esta ação remove permanentemente {summary?.ordersCount ?? 0} ordem(ns) de venda e seus itens. Clientes
              e produtos cadastrados não são afetados. Esta ação não pode ser desfeita.
            </Text>
            <View style={styles.modalActions}>
              <View style={styles.modalActionButton}>
                <PrimaryButton label="Cancelar" variant="outline" onPress={() => setConfirmClearVisible(false)} />
              </View>
              <View style={styles.modalActionButton}>
                <PrimaryButton
                  label="Sim, limpar tudo"
                  variant="danger"
                  onPress={handleConfirmClearOrders}
                  loading={clearing}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
    width: '100%',
    maxWidth: 720,
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
  deviceIdBox: {
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  deviceIdText: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: colors.textPrimary,
  },
  helperText: {
    fontSize: 11.5,
    color: colors.textDisabled,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  logoPreview: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.slate50,
  },
  logoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoActions: {
    flex: 1,
    gap: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate700,
  },
  infoValue: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate50,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  dangerZoneTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dangerStrong,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.floating,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.dangerBgSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 13.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  modalActionButton: {
    flex: 1,
  },
});
