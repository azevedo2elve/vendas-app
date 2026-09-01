import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useToast } from '@/components/Toast';
import { colors, radii, spacing } from '@/theme';
import {
  exportBackup,
  importBackup,
  pickAndPreviewBackupFile,
  saveBackupToDevice,
  type BackupPreview,
} from '@/services/backupService';
import { useLicenseAccess } from '@/hooks/useLicenseAccess';

type FeedbackState = { type: 'success' | 'error'; message: string };

export function BackupScreen() {
  const [exporting, setExporting] = useState(false);
  const [savingToDevice, setSavingToDevice] = useState(false);
  const [picking, setPicking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const { showToast } = useToast();
  const { readOnly } = useLicenseAccess();

  async function handleExport() {
    setExporting(true);
    setFeedback(null);
    try {
      const result = await exportBackup();
      setFeedback({
        type: 'success',
        message: `Backup gerado com ${result.clientsCount} cliente(s), ${result.productsCount} produto(s) e ${result.ordersCount} pedido(s). Escolha onde salvar/enviar no menu que abriu.`,
      });
    } catch (error) {
      setFeedback({ type: 'error', message: `Não foi possível exportar o backup: ${String(error)}` });
    } finally {
      setExporting(false);
    }
  }

  async function handleSaveToDevice() {
    setSavingToDevice(true);
    setFeedback(null);
    try {
      const result = await saveBackupToDevice();
      if (result) {
        setFeedback({
          type: 'success',
          message: `Backup salvo com ${result.clientsCount} cliente(s), ${result.productsCount} produto(s) e ${result.ordersCount} pedido(s) na pasta escolhida.`,
        });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: `Não foi possível salvar o backup: ${String(error)}` });
    } finally {
      setSavingToDevice(false);
    }
  }

  async function handlePickFile() {
    setPicking(true);
    setFeedback(null);
    setPreview(null);
    try {
      const result = await pickAndPreviewBackupFile();
      if (result) {
        setPreview(result);
      }
    } catch (error) {
      setFeedback({ type: 'error', message: String(error instanceof Error ? error.message : error) });
    } finally {
      setPicking(false);
    }
  }

  async function handleConfirmImport() {
    if (!preview) return;
    setImporting(true);
    try {
      const result = await importBackup(preview.data);
      setFeedback({
        type: 'success',
        message: `Importação concluída: ${result.clientsImported} cliente(s), ${result.productsImported} produto(s) e ${result.ordersImported} pedido(s) adicionados.`,
      });
      showToast('Importação concluída com sucesso!', 'success');
      setPreview(null);
    } catch (error) {
      setFeedback({ type: 'error', message: `Não foi possível importar o backup: ${String(error)}` });
    } finally {
      setImporting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <View style={styles.cardTitleRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accentLight }]}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.accent} />
          </View>
          <Text style={styles.cardTitle}>Exportar backup</Text>
        </View>
        <Text style={styles.description}>
          Gera um arquivo JSON com todos os Clientes, Categorias, Produtos e Ordens de Venda cadastrados.
        </Text>
        <PrimaryButton label="Compartilhar backup" icon="share-outline" onPress={handleExport} loading={exporting} />
        <Text style={styles.description}>
          Se o menu de compartilhamento não tiver uma opção para salvar direto no aparelho (comum em
          emuladores), use o botão abaixo para escolher uma pasta (ex: Downloads) e salvar ali.
        </Text>
        <PrimaryButton
          label="Salvar no dispositivo"
          variant="outline"
          icon="save-outline"
          onPress={handleSaveToDevice}
          loading={savingToDevice}
        />
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardTitleRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.successBgSoft }]}>
            <Ionicons name="cloud-download-outline" size={20} color={colors.success} />
          </View>
          <Text style={styles.cardTitle}>Importar backup</Text>
        </View>
        <Text style={styles.description}>
          Restaura Clientes, Categorias, Produtos e Ordens de Venda a partir de um arquivo de backup exportado
          anteriormente. Registros já existentes (mesmo CPF/CNPJ, nome, ou cliente+número do pedido) são ignorados
          — não duplica dados. A data de criação original dos pedidos não é preservada (vira a data da importação).
        </Text>
        {readOnly ? (
          <Text style={styles.readOnlyNotice}>Licença expirada — importação indisponível (exportar continua liberado).</Text>
        ) : null}
        <PrimaryButton
          label="Escolher arquivo de backup"
          variant="outline"
          icon="folder-open-outline"
          onPress={handlePickFile}
          loading={picking}
          disabled={readOnly}
        />

        {preview ? (
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>Pronto para importar:</Text>
            <Text style={styles.previewRow}>
              • {preview.newClients} cliente(s) novo(s)
              {preview.duplicateClients > 0 ? ` (${preview.duplicateClients} já existem, serão ignorados)` : ''}
            </Text>
            <Text style={styles.previewRow}>
              • {preview.newCategories} categoria(s) nova(s)
              {preview.duplicateCategories > 0 ? ` (${preview.duplicateCategories} já existem, serão ignoradas)` : ''}
            </Text>
            <Text style={styles.previewRow}>
              • {preview.newProducts} produto(s) novo(s)
              {preview.duplicateProducts > 0 ? ` (${preview.duplicateProducts} já existem, serão ignorados)` : ''}
            </Text>
            <Text style={styles.previewRow}>
              • {preview.newOrders} pedido(s) novo(s)
              {preview.skippedOrders > 0 ? ` (${preview.skippedOrders} ignorados — já existem ou cliente não encontrado)` : ''}
            </Text>
            <View style={styles.previewActions}>
              <PrimaryButton
                label="Confirmar importação"
                onPress={handleConfirmImport}
                loading={importing}
                disabled={
                  preview.newClients === 0 &&
                  preview.newCategories === 0 &&
                  preview.newProducts === 0 &&
                  preview.newOrders === 0
                }
                style={styles.previewActionButton}
              />
              <PrimaryButton
                label="Cancelar"
                variant="outline"
                onPress={() => setPreview(null)}
                style={styles.previewActionButton}
              />
            </View>
          </View>
        ) : null}
      </Card>

      {feedback ? (
        <View style={[styles.feedbackBox, feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError]}>
          <Ionicons
            name={feedback.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={18}
            color={feedback.type === 'success' ? colors.successStrong : colors.dangerStrong}
          />
          <Text
            style={[
              styles.feedbackText,
              { color: feedback.type === 'success' ? colors.successStrong : colors.dangerStrong },
            ]}
          >
            {feedback.message}
          </Text>
        </View>
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
    maxWidth: 640,
    alignSelf: 'center',
  },
  card: {
    gap: spacing.sm,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  readOnlyNotice: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.warningStrong,
  },
  previewBox: {
    backgroundColor: colors.slate50,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 6,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  previewRow: {
    fontSize: 13,
    color: colors.slate700,
  },
  previewActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 4,
  },
  previewActionButton: {
    flex: 1,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  feedbackSuccess: {
    backgroundColor: colors.successBgSoft,
  },
  feedbackError: {
    backgroundColor: colors.dangerBgSoft,
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
