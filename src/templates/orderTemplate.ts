import type Client from '@/database/models/Client';
import type Order from '@/database/models/Order';
import type OrderItem from '@/database/models/OrderItem';
import { PAYMENT_METHOD_LABELS } from '@/types/database';
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

export function buildOrderHtml(order: Order, client: Client, items: OrderItem[]): string {
  const orderCode = order.id.slice(0, 8).toUpperCase();
  const createdAt = order.createdAt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const createdAtTime = order.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

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
    margin-bottom: 20px;
  }
  .brand { font-size: 20px; font-weight: 800; color: #0F172A; }
  .brand-sub { font-size: 11px; color: #64748B; margin-top: 2px; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 16px; margin: 0; color: #2563EB; }
  .doc-title p { margin: 2px 0 0; color: #64748B; font-size: 11px; }
  .section {
    display: flex;
    gap: 24px;
    margin-bottom: 20px;
  }
  .box {
    flex: 1;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 14px 16px;
  }
  .box h3 {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748B;
    margin: 0 0 8px;
  }
  .box p { margin: 3px 0; font-size: 12.5px; }
  .box .name { font-weight: 700; font-size: 14px; color: #0F172A; }
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
  .meta-row { display: flex; justify-content: space-between; margin-bottom: 16px; }
  .badge {
    display: inline-block;
    background: #DBEAFE;
    color: #1D4ED8;
    font-weight: 700;
    font-size: 10px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 999px;
  }
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
    <div>
      <div class="brand">Força de Vendas</div>
      <div class="brand-sub">Ordem de venda gerada pelo app offline</div>
    </div>
    <div class="doc-title">
      <h1>ORDEM DE VENDA</h1>
      <p>Nº ${orderCode} · ${createdAt} às ${createdAtTime}</p>
    </div>
  </div>

  <div class="section">
    <div class="box">
      <h3>Cliente</h3>
      <p class="name">${escapeHtml(client.name)}</p>
      <p>${maskCpfCnpj(client.document)}</p>
      <p>${maskPhone(client.phone)}</p>
      ${client.address ? `<p>${escapeHtml(client.address)}</p>` : ''}
    </div>
    <div class="box">
      <h3>Pagamento</h3>
      <p class="name">${PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
      <p><span class="badge">${items.length} ${items.length === 1 ? 'item' : 'itens'}</span></p>
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

  <div class="footer">Documento gerado offline pelo aplicativo Força de Vendas — sem validade fiscal.</div>
</body>
</html>`;
}
