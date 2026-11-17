import { Platform, Linking } from 'react-native';
import type { CompletedPayment } from './store';
import { naira } from './theme';
import { receiptQrDataUrl } from './receipt-qr';

export function receiptMethod(channel: string): string {
  if (channel === 'CASH') return 'Cash';
  if (channel === 'CARD') return 'Card (Paystack test)';
  if (channel === 'BANK_TRANSFER') return 'Transfer (Paystack test)';
  return channel.replaceAll('_', ' ');
}

export function receiptText(payment: CompletedPayment): string {
  const { sale, cashReceived, change } = payment;
  const channel = sale.payments[0]?.channel ?? '';
  const test = channel !== 'CASH';
  return [
    'KASSA — ' + (test ? 'TEST RECEIPT' : 'SALE RECEIPT'),
    'Reference: ' + sale.reference,
    '',
    ...sale.items.map(item => item.name + ' — ' + item.quantity + ' × ' +
      naira(Number(item.unitPrice)) + ' = ' + naira(Number(item.lineTotal))),
    '',
    'Total: ' + naira(Number(sale.total)),
    'Payment: ' + receiptMethod(channel),
    ...(cashReceived === null ? [] : [
      'Cash received: ' + naira(cashReceived),
      'Change given: ' + naira(change),
    ]),
    test ? 'PAYSTACK TEST MODE — Not proof of a live charge.' : 'Cash receipt confirmed by KASSA.',
  ].join('\n');
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, char => entities[char] ?? char);
}

export function receiptHtml(payment: CompletedPayment): string {
  const { sale, cashReceived, change } = payment;
  const channel = sale.payments[0]?.channel ?? '';
  const test = channel !== 'CASH';
  const qrDataUrl = receiptQrDataUrl(sale);
  const rows = sale.items.map(item => '<tr><td>' + escapeHtml(item.name) +
    '<div class="small">' + item.quantity + ' × ' + naira(Number(item.unitPrice)) +
    '</div></td><td class="right">' + naira(Number(item.lineTotal)) + '</td></tr>').join('');
  return '<!DOCTYPE html><html><head><meta charset="utf-8"/>' +
    '<style>body{font-family:Arial,sans-serif;color:#172923;margin:24px auto;max-width:360px}' +
    'h1{text-align:center;color:#0F6E56}.small{color:#667085;font-size:11px;margin-top:4px}' +
    'table{width:100%;border-collapse:collapse}td{padding:11px 0;border-bottom:1px solid #eee}' +
    '.right{text-align:right;font-weight:bold}.total{font-weight:bold;font-size:18px}' +
    'p{font-size:12px}.qr{text-align:center;margin-top:24px;padding-top:16px;border-top:1px dashed #ccc}' +
    '.qr img{width:178px;height:178px;image-rendering:pixelated}' +
    '.qr .hint{font-size:10px;color:#667085;line-height:1.5}' +
    'footer{margin-top:25px;font-size:10px;color:#666}</style></head><body>' +
    '<h1>KASSA</h1><p>' + (test ? 'PAYSTACK TEST RECEIPT' : 'SALE RECEIPT') + '</p>' +
    '<p>Reference: ' + escapeHtml(sale.reference) + '</p><table>' + rows +
    '<tr><td class="total">Total</td><td class="total right">' + naira(Number(sale.total)) + '</td></tr>' +
    '<tr><td>Payment method</td><td class="right">' + escapeHtml(receiptMethod(channel)) + '</td></tr>' +
    (cashReceived === null ? '' : '<tr><td>Cash received</td><td class="right">' + naira(cashReceived) +
      '</td></tr><tr><td>Change</td><td class="right">' + naira(change) + '</td></tr>') +
    '</table><div class="qr"><img alt="Receipt QR code" src="' + qrDataUrl + '"/>' +
    '<p><strong>Scan for receipt details</strong></p>' +
    '<p class="hint">Receipt reference information only. Contact the merchant to verify.</p></div>' +
    '<footer>' + (test ? 'Test mode only. No live Paystack charge was made.' : 'Confirmed cash sale.') +
    '</footer></body></html>';
}

export async function shareReceiptWhatsApp(payment: CompletedPayment): Promise<void> {
  await Linking.openURL('https://wa.me/?text=' + encodeURIComponent(receiptText(payment)));
}

export async function shareReceiptSms(payment: CompletedPayment): Promise<void> {
  const prefix = Platform.OS === 'ios' ? 'sms:&body=' : 'sms:?body=';
  await Linking.openURL(prefix + encodeURIComponent(receiptText(payment)));
}
