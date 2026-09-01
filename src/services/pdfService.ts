import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type Client from '@/database/models/Client';
import type Order from '@/database/models/Order';
import type OrderItem from '@/database/models/OrderItem';
import { getOrCreateCompanySettings } from '@/services/settingsService';
import { buildOrderHtml } from '@/templates/orderTemplate';

export async function shareOrderPdf(order: Order, client: Client, items: OrderItem[]): Promise<void> {
  const company = await getOrCreateCompanySettings();
  const html = buildOrderHtml(order, client, items, company);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('O compartilhamento não está disponível neste dispositivo.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Ordem de venda #${order.id.slice(0, 8).toUpperCase()}`,
    UTI: 'com.adobe.pdf',
  });
}
