import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { database } from '@/database';
import LicenseControl from '@/database/models/LicenseControl';
import { LoadingView } from '@/components/LoadingView';
import { testSupabaseFetch } from '@/services/licenseService';

type DiagnosticsState = {
  clients: number;
  products: number;
  orders: number;
  license: LicenseControl;
};

async function loadDiagnostics(): Promise<DiagnosticsState> {
  const [clients, products, orders, licenses] = await Promise.all([
    database.get('clients').query().fetchCount(),
    database.get('products').query().fetchCount(),
    database.get('orders').query().fetchCount(),
    database.get<LicenseControl>('license_control').query().fetch(),
  ]);

  return { clients, products, orders, license: licenses[0] };
}

export function HomeScreen() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    loadDiagnostics().then(setDiagnostics);
  }, []);

  async function handleTestSupabase() {
    setTesting(true);
    setTestResult(null);
    const result = await testSupabaseFetch();
    setTestResult(result);
    setTesting(false);
  }

  if (!diagnostics) {
    return <LoadingView message="Verificando banco de dados local..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Força de Vendas Offline</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Licença</Text>
        <Text style={styles.row}>Status: {diagnostics.license.licenseStatus}</Text>
        <Text style={styles.row}>ID do dispositivo: {diagnostics.license.deviceId}</Text>
        <Text style={styles.row}>
          Expira em: {diagnostics.license.licenseExpiresAt.toLocaleString('pt-BR')}
        </Text>
        <Text style={styles.row}>
          Último acesso: {diagnostics.license.lastOpenedAt.toLocaleString('pt-BR')}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Banco de dados local (WatermelonDB)</Text>
        <Text style={styles.row}>Clientes cadastrados: {diagnostics.clients}</Text>
        <Text style={styles.row}>Produtos cadastrados: {diagnostics.products}</Text>
        <Text style={styles.row}>Ordens de venda: {diagnostics.orders}</Text>
      </View>

      {__DEV__ ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Debug — Supabase (só em dev)</Text>
          <Text style={styles.row}>
            Consulta a tabela `licenses` por este device_id, sem alterar a licença local.
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleTestSupabase} disabled={testing}>
            {testing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Testar fetch no Supabase</Text>
            )}
          </TouchableOpacity>
          {testResult ? (
            <Text style={[styles.row, testResult.ok ? styles.resultOk : styles.resultError]}>
              {testResult.ok ? '✓ ' : '✗ '}
              {testResult.message}
            </Text>
          ) : null}
        </View>
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  row: {
    fontSize: 13,
    color: '#475569',
  },
  button: {
    marginTop: 4,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resultOk: {
    color: '#16A34A',
    fontWeight: '600',
  },
  resultError: {
    color: '#DC2626',
    fontWeight: '600',
  },
});
