import type Client from '@/database/models/Client';
import type CompanySettings from '@/database/models/CompanySettings';
import type Order from '@/database/models/Order';
import type OrderItem from '@/database/models/OrderItem';
import { PAYMENT_METHOD_LABELS } from '@/types/database';
import { APP_DISPLAY_NAME } from '@/utils/appInfo';
import { formatClientCityLine, formatClientStreetLine } from '@/utils/address';
import { formatCurrencyBRL, maskCpfCnpj, maskPhone } from '@/utils/masks';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function buildOrderHtml(order: Order, client: Client, items: OrderItem[], company: CompanySettings): string {
  const orderCode = order.id.slice(0, 8).toUpperCase();
  const createdAt = formatDate(order.createdAt);
  const createdAtTime = order.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const companyName = escapeHtml(company.nomeFantasia?.trim() || company.razaoSocial?.trim() || 'Empresa');
  const companyPhone = company.phone ? maskPhone(company.phone) : '';
  const vendedorNome = company.vendedorNome?.trim();
  // Número sequencial do pedido para este cliente (não um id global) — `0` é o sentinela de
  // pedido criado antes da Fase 13, quando essa numeração ainda não existia.
  const orderNumberLabel = order.orderNumber > 0 ? String(order.orderNumber) : `${orderCode} (ref.)`;
  const deliveryDateLabel = order.deliveryDate ? formatDate(order.deliveryDate) : 'A combinar';
  const streetLine = escapeHtml(formatClientStreetLine(client)) || '—';
  const cityLine = escapeHtml(formatClientCityLine(client)) || '—';

  const rows = items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.productNameSnapshot)}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">${formatCurrencyBRL(item.unitPrice)}</td>
          <td class="right">${item.discountValue > 0 ? '-' + formatCurrencyBRL(item.discountValue) : '—'}</td>
          <td class="right strong">${formatCurrencyBRL(item.subtotal)}</td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, Helvetica, Arial, sans-serif;
    color: #0F172A;
    margin: 0;
    padding: 36px 40px;
    font-size: 12px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #2563EB;
    padding-bottom: 16px;
    margin-bottom: 16px;
  }
  .header-left { display: flex; align-items: center; }
  .logo { max-height: 56px; max-width: 220px; object-fit: contain; }
  .brand { font-size: 20px; font-weight: 800; color: #0F172A; }
  .header-right { text-align: right; }
  .header-right p { margin: 2px 0; font-size: 12px; color: #334155; }
  .header-right .doc-title { font-size: 14px; font-weight: 800; color: #2563EB; margin-bottom: 4px; }
  .info-grid {
    display: flex;
    gap: 24px;
    margin-bottom: 20px;
  }
  .info-col { flex: 1; }
  .info-col.align-right { text-align: right; }
  .info-label {
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748B;
    margin: 8px 0 1px;
  }
  .info-col .info-label:first-child { margin-top: 0; }
  .info-value { margin: 0; font-size: 12.5px; color: #0F172A; }
  .info-value.name { font-weight: 700; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th {
    text-align: left;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #FFFFFF;
    background: #0F172A;
    padding: 10px 12px;
  }
  thead th.center { text-align: center; }
  thead th.right { text-align: right; }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; }
  tbody tr:nth-child(even) { background: #F8FAFC; }
  td.center { text-align: center; }
  td.right { text-align: right; }
  td.strong { font-weight: 700; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 24px; }
  .totals table { width: 280px; margin: 0; }
  .totals td { padding: 6px 4px; border: none; font-size: 12.5px; }
  .totals .label { color: #64748B; }
  .totals .value { text-align: right; font-weight: 600; }
  .totals .grand td { border-top: 2px solid #0F172A; padding-top: 10px; font-size: 16px; }
  .totals .grand .label { color: #0F172A; font-weight: 800; }
  .totals .grand .value { color: #059669; font-weight: 800; }
  .notes {
    background: #FFFBEB;
    border: 1px solid #FEF3C7;
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 12px;
    margin-bottom: 20px;
  }
  .notes h3 { margin: 0 0 4px; font-size: 10px; text-transform: uppercase; color: #B45309; letter-spacing: 0.4px; }
  .footer {
    text-align: center;
    color: #94A3B8;
    font-size: 10px;
    border-top: 1px solid #E2E8F0;
    padding-top: 12px;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${company.logoBase64 ? `<img class="logo" src="${company.logoBase64}" />` : `<div class="brand">${companyName}</div>`}
    </div>
    <div class="header-right">
      <div class="doc-title">ORDEM DE VENDA</div>
      ${companyPhone ? `<p>${companyPhone}</p>` : ''}
      ${vendedorNome ? `<p>${escapeHtml(vendedorNome)}</p>` : ''}
      <p>${createdAt} às ${createdAtTime}</p>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-col">
      <p class="info-label">Cliente</p>
      <p class="info-value name">${escapeHtml(client.name)}</p>
      <p class="info-label">Entrega</p>
      <p class="info-value">${deliveryDateLabel}</p>
      <p class="info-label">Endereço</p>
      <p class="info-value">${streetLine}</p>
      <p class="info-label">Pagamento</p>
      <p class="info-value">${PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
    </div>
    <div class="info-col align-right">
      <p class="info-label">Pedido nº (cliente)</p>
      <p class="info-value name">${orderNumberLabel}</p>
      <p class="info-label">Cidade</p>
      <p class="info-value">${cityLine}</p>
      <p class="info-label">CPF/CNPJ</p>
      <p class="info-value">${maskCpfCnpj(client.document)}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Produto</th>
        <th class="center">Qtd.</th>
        <th class="right">Preço unit.</th>
        <th class="right">Desconto</th>
        <th class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  ${order.notes ? `<div class="notes"><h3>Observações</h3><p>${escapeHtml(order.notes)}</p></div>` : ''}

  <div class="totals">
    <table>
      <tr>
        <td class="label">Total bruto</td>
        <td class="value">${formatCurrencyBRL(order.totalGross)}</td>
      </tr>
      <tr>
        <td class="label">Desconto geral</td>
        <td class="value">-${formatCurrencyBRL(order.discountTotal)}</td>
      </tr>
      <tr class="grand">
        <td class="label">Total líquido</td>
        <td class="value">${formatCurrencyBRL(order.totalNet)}</td>
      </tr>
    </table>
  </div>

  <div class="footer">Documento gerado offline pelo aplicativo ${APP_DISPLAY_NAME} — sem validade fiscal.</div>
</body>
</html>`;
}
