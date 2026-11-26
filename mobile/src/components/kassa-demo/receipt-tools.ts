import { Platform, Linking } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { CompletedPayment } from './store';
import { naira } from './theme';
import { receiptQrDataUrl } from './receipt-qr';

export function receiptMethod(channel: string): string {
  if (channel === 'CASH') return 'Cash';
  if (channel === 'CARD') return 'Card / POS';
  if (channel === 'POS') return 'POS terminal';
  if (channel === 'BANK_TRANSFER') return 'Bank transfer';
  return channel.replaceAll('_', ' ');
}

export function receiptText(payment: CompletedPayment): string {
  const { sale, cashReceived, change } = payment;
  const channel = sale.payments[0]?.channel ?? '';
  const test = sale.payments.some(p => p.provider === 'PAYSTACK_TEST');
  return [
    'KASSA — ' + (test ? 'NON-LIVE RECEIPT' : 'SALE RECEIPT'),
    'Reference: ' + sale.reference,
    'Date: ' + new Date(sale.createdAt).toLocaleString('en-NG'),
    ...(sale.customer ? ['Customer: ' + sale.customer] : []),
    '',
    ...sale.items.map(item => item.name + ' — ' + item.quantity + ' × ' +
      naira(Number(item.unitPrice)) + ' = ' + naira(Number(item.lineTotal))),
    '',
    'Subtotal: ' + naira(Number(sale.subtotal)),
    ...(Number(sale.discount ?? 0) > 0 ? ['Discount: −' + naira(Number(sale.discount))] : []),
    'Total: ' + naira(Number(sale.total)),
    'Payment: ' + receiptMethod(channel),
    ...(cashReceived === null ? [] : [
      'Cash received: ' + naira(cashReceived),
      'Change given: ' + naira(change),
    ]),
    test ? 'Non-live receipt. No real funds received.' :
      'Payment recorded as received by merchant staff. KASSA did not handle or independently verify customer funds.',
  ].join('\n');
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, char => entities[char] ?? char);
}

export function receiptHtml(payment: CompletedPayment): string {
  const { sale, cashReceived, change } = payment;
  const channel = sale.payments[0]?.channel ?? '';
  const test = sale.payments.some(p => p.provider === 'PAYSTACK_TEST');
  const qrDataUrl = receiptQrDataUrl(sale);
  const rows = sale.items.map(item => '<tr><td>' + escapeHtml(item.name) +
    '<div class="small">' + item.quantity + ' × ' + naira(Number(item.unitPrice)) +
    '</div></td><td class="right">' + naira(Number(item.lineTotal)) + '</td></tr>').join('');
  return '<!DOCTYPE html><html><head><meta charset="utf-8"/>' +
    '<style>body{font-family:Arial,sans-serif;color:#172923;margin:24px auto;max-width:360px}' +
    'h1{text-align:center;color:#0F6E56}.small{color:#667085;font-size:11px;margin-top:4px}' +
    'table{width:100%;border-collapse:collapse}td{padding:11px 0;border-bottom:1px solid #eee}' +
    '.right{text-align:right;font-weight:bold}.total{font-weight:bold;font-size:18px}' +
    'p{font-size:12px}.qr{display:flex;align-items:center;gap:12px;margin-top:18px;padding-top:14px;border-top:1px solid #e5e7eb}' +
    '.qr img{width:96px;height:96px;flex-shrink:0;image-rendering:pixelated}' +
    '.qr .qrinfo{min-width:0;flex:1;overflow-wrap:anywhere}' +
    '.qr .ref{font-size:10px;color:#0F6E56;margin:5px 0;overflow-wrap:anywhere}' +
    '.qr .hint{font-size:10px;color:#667085;line-height:1.5}' +
    'footer{margin-top:25px;font-size:10px;color:#666}</style></head><body>' +
    '<h1>KASSA</h1><p>' + (test ? 'PAYSTACK NON-LIVE RECEIPT' : 'SALE RECEIPT') + '</p>' +
    '<p>Reference: ' + escapeHtml(sale.reference) + '</p>' +
    '<p>Date: ' + escapeHtml(new Date(sale.createdAt).toLocaleString('en-NG')) + '</p>' +
    (sale.customer ? '<p>Customer: ' + escapeHtml(sale.customer) + '</p>' : '') +
    '<table>' + rows +
    '<tr><td>Subtotal</td><td class="right">' + naira(Number(sale.subtotal)) + '</td></tr>' +
    (Number(sale.discount ?? 0) > 0 ? '<tr><td>Discount</td><td class="right">−' + naira(Number(sale.discount)) + '</td></tr>' : '') +
    '<tr><td class="total">Total</td><td class="total right">' + naira(Number(sale.total)) + '</td></tr>' +
    '<tr><td>Payment method</td><td class="right">' + escapeHtml(receiptMethod(channel)) + '</td></tr>' +
    (cashReceived === null ? '' : '<tr><td>Cash received</td><td class="right">' + naira(cashReceived) +
      '</td></tr><tr><td>Change</td><td class="right">' + naira(change) + '</td></tr>') +
    '</table><div class="qr"><img alt="Receipt QR code" src="' + qrDataUrl + '"/>' +
    '<div class="qrinfo"><p><strong>Scan for receipt details</strong></p>' +
    '<p class="ref">' + escapeHtml(sale.reference) + '</p>' +
    '<p class="hint">Reference only. Verify payments with the merchant.</p></div></div>' +
    '<footer>' + (test ? 'No real funds received.' :
      'Payment recorded as received by merchant staff. KASSA did not process customer funds.') +
    '</footer></body></html>';
}

export async function shareReceiptWhatsApp(payment: CompletedPayment): Promise<void> {
  await Linking.openURL('https://wa.me/?text=' + encodeURIComponent(receiptText(payment)));
}

export async function shareReceiptSms(payment: CompletedPayment): Promise<void> {
  const prefix = Platform.OS === 'ios' ? 'sms:&body=' : 'sms:?body=';
  await Linking.openURL(prefix + encodeURIComponent(receiptText(payment)));
}


/** Generate a real PDF file and open the native share/save sheet. */
export async function exportReceiptPdf(payment: CompletedPayment): Promise<void> {
  const file = await Print.printToFileAsync({
    html: receiptHtml(payment),
    base64: false,
  });
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('PDF sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Save or share KASSA receipt PDF',
    UTI: 'com.adobe.pdf',
  });
}
