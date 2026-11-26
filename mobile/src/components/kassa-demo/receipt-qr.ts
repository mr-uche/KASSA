import qrcode from 'qrcode-generator';
import type { CheckoutSale } from './api';

// A QR code that can be scanned by any standard phone camera.
// It conveys receipt details; it does NOT pretend to be a signed or
// publicly verifiable proof of payment.
export function receiptQrContent(sale: CheckoutSale): string {
  const payment = sale.payments.find(item => item.status === 'SUCCEEDED');
  const testMode = sale.payments.some(item => item.provider === 'PAYSTACK_TEST');
  return [
    'KASSA RECEIPT',
    'REF:' + sale.reference,
    'AMOUNT:NGN ' + sale.total,
    'METHOD:' + (payment?.channel ?? 'UNKNOWN'),
    testMode ? 'TEST PAYMENT - NOT LIVE' : 'RECORDED PAID SALE',
  ].join('\n');
}

export function receiptQrDataUrl(sale: CheckoutSale): string {
  const qr = qrcode(0, 'M');
  qr.addData(receiptQrContent(sale));
  qr.make();
  return qr.createDataURL(5, 5);
}
