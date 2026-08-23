import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  exportBackup,
  importBackup,
  pickAndPreviewBackupFile,
  saveBackupToDevice,
  type BackupPreview,
} from '@/services/backupService';

type FeedbackState = { type: 'success' | 'error'; message: string };

export function BackupScreen() {
  const [exporting, setExporting] = useState(false);
  const [savingToDevice, setSavingToDevice] = useState(false);
  const [picking, setPicking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  async function handleExport() {
    setExporting(true);
    setFeedback(null);
    try {
      const result = await exportBackup();
      setFeedback({
        type: 'success',
        message: `Backup gerado com ${result.clientsCount} cliente(s) e ${result.productsCount} produto(s). Escolha onde salvar/enviar no menu que abriu.`,
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
          message: `Backup salvo com ${result.clientsCount} cliente(s) e ${result.productsCount} produto(s) na pasta escolhida.`,
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
        message: `Importação concluída: ${result.clientsImported} cliente(s) e ${result.productsImported} produto(s) adicionados.`,
      });
      setPreview(null);
    } catch (error) {
      setFeedback({ type: 'error', message: `Não foi possível importar o backup: ${String(error)}` });
    } finally {
      setImporting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Exportar backup</Text>
        <Text style={styles.description}>
          Gera um arquivo JSON com todos os Clientes e Produtos cadastrados.
        </Text>
        <PrimaryButton label="Compartilhar backup" onPress={handleExport} loading={exporting} />
        <Text style={styles.description}>
          Se o menu de compartilhamento não tiver uma opção para salvar direto no aparelho (comum em
          emuladores), use o botão abaixo para escolher uma pasta (ex: Downloads) e salvar ali.
        </Text>
        <PrimaryButton
          label="Salvar no dispositivo"
          variant="outline"
          onPress={handleSaveToDevice}
          loading={savingToDevice}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Importar backup</Text>
        <Text style={styles.description}>
          Restaura Clientes e Produtos a partir de um arquivo de backup exportado anteriormente. Registros já
          existentes (mesmo CPF/CNPJ ou SKU) são ignorados — não duplica dados.
        </Text>
        <PrimaryButton label="Escolher arquivo de backup" variant="outline" onPress={handlePickFile} loading={picking} />

        {preview ? (
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>Pronto para importar:</Text>
            <Text style={styles.previewRow}>
              • {preview.newClients} cliente(s) novo(s)
              {preview.duplicateClients > 0 ? ` (${preview.duplicateClients} já existem, serão ignorados)` : ''}
            </Text>
            <Text style={styles.previewRow}>
              • {preview.newProducts} produto(s) novo(s)
              {preview.duplicateProducts > 0 ? ` (${preview.duplicateProducts} já existem, serão ignorados)` : ''}
            </Text>
            <View style={styles.previewActions}>
              <PrimaryButton
                label="Confirmar importação"
                onPress={handleConfirmImport}
                loading={importing}
                disabled={preview.newClients === 0 && preview.newProducts === 0}
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
      </View>

      {feedback ? (
        <Text style={[styles.feedback, feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError]}>
          {feedback.message}
        </Text>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  description: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  previewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  previewRow: {
    fontSize: 13,
    color: '#334155',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  previewActionButton: {
    flex: 1,
  },
  feedback: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  feedbackSuccess: {
    color: '#16A34A',
  },
  feedbackError: {
    color: '#DC2626',
  },
});
