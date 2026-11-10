import { createHmac, timingSafeEqual } from 'node:crypto';

function safeMatch(expected: Buffer, provided: string): boolean {
  if (!/^[0-9a-f]{128}$/.test(provided)) return false;
  return timingSafeEqual(expected, Buffer.from(provided, 'hex'));
}

/**
 * Paystack v2: Paystack-Signature: t=...,v1=whk_...:<HMAC SHA512>
 * Legacy: x-paystack-signature: <HMAC SHA512(raw_body, sk_test_...)>
 * Never serialize a parsed JSON object to reconstruct the signed body.
 */
export function verifyPaystackSignature(
  rawBody: Buffer, modernHeader: string | undefined,
  legacyHeader: string | undefined,
  webhookSecret: string | undefined,
  testApiSecret: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (modernHeader) {
    if (!webhookSecret?.startsWith('whsec_')) return false;
    const parts = modernHeader.split(',');
    const timestampPart = parts.find((part) => part.startsWith('t='));
    const timestamp = timestampPart?.slice(2) ?? '';
    if (!/^\d{10,11}$/.test(timestamp) ||
        Math.abs(Number(timestamp) - nowSeconds) > 300) return false;
    const prefix = Buffer.from(timestamp + '.', 'utf8');
    const expected = createHmac('sha512', webhookSecret).update(prefix).update(rawBody).digest();
    return parts.some((part) => {
      if (!part.startsWith('v1=')) return false;
      const signed = part.slice(3);
      const colon = signed.indexOf(':');
      return colon > 0 && /^whk_[A-Za-z0-9_-]+$/.test(signed.slice(0, colon)) &&
        safeMatch(expected, signed.slice(colon + 1));
    });
  }
  if (!legacyHeader || !testApiSecret?.startsWith('sk_test_')) return false;
  const expected = createHmac('sha512', testApiSecret).update(rawBody).digest();
  return safeMatch(expected, legacyHeader);
}
