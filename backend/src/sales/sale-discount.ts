import { BadRequestException } from '@nestjs/common';

// All money calculations use integer kobo. A zero-payable sale is not a supported payment.
export function saleDiscountKobo(subtotal: bigint, amount?: string): bigint {
  const raw = amount === undefined ? '0' : amount;
  if (typeof raw !== 'string' || !/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(raw))
    throw new BadRequestException('Invalid sale discount');
  const [whole, fraction = ''] = raw.split('.');
  const discount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (subtotal <= 0n || discount >= subtotal)
    throw new BadRequestException('Sale discount must be less than the subtotal');
  return discount;
}
