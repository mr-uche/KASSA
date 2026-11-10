import {
  BadGatewayException, BadRequestException, ConflictException,
  ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { requireBusinessPermission } from '../business-access';
import { InitializePaystackDto, ReconcilePaystackDto } from './paystack.dto';

const PROVIDER = 'PAYSTACK_TEST';
const API = 'https://api.paystack.co';
const CHANNELS: Record<string, string[]> = {
  CARD: ['card'],
  BANK_TRANSFER: ['bank_transfer'],
  USSD: ['ussd'],
};
const checkoutOrigin = 'https://checkout.paystack.com';

type Verification = {
  id: number | string;
  domain: string;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at?: string | null;
  channel?: string;
};

function koboFromDecimal(value: string): bigint {
  if (!/^(?:0|[1-9]\d{0,12})(?:\.\d{1,2})?$/.test(value)) {
    throw new ConflictException('Saved sale amount is invalid');
  }
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}
function validCheckoutUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.origin === checkoutOrigin && url.username === '' && url.password === '';
  } catch { return false; }
}
function validPaystackReference(reference: unknown): reference is string {
  return typeof reference === 'string' && /^PAY-[0-9a-f-]{36}$/i.test(reference);
}
type SaleForPayment = NonNullable<Awaited<ReturnType<PaystackService['getSaleForPayment']>>>;

@Injectable()
export class PaystackService {
  constructor(private readonly prisma: PrismaService) {}

  private testKey(): string {
    const key = process.env.PAYSTACK_SECRET_KEY?.trim() ?? '';
    if (!key) throw new ServiceUnavailableException('Paystack test payments are not configured yet');
    if (!key.startsWith('sk_test_') || key.length < 16) {
      throw new ServiceUnavailableException('Only Paystack TEST secret keys are allowed in this integration');
    }
    return key;
  }

  // This API is intentionally fixed to Paystack over TLS: never accept a gateway URL from the client.
  private async paystackRequest(route: string, method: 'GET' | 'POST', body?: object) {
    const secret = this.testKey();
    let response: Response;
    try {
      response = await fetch(API + route, {
        method,
        headers: {
          Authorization: 'Bearer ' + secret,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        cache: 'no-store',
        signal: AbortSignal.timeout(7000),
      });
    } catch {
      throw new BadGatewayException('Could not contact Paystack securely; try verification again later');
    }
    const result: unknown = await response.json().catch(() => null);
    return { ok: response.ok, data: result };
  }

  async getSaleForPayment(userId: string, saleId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: { payments: true, items: true },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    await requireBusinessPermission(
      this.prisma, userId, sale.businessId, 'Manage sales & transactions', sale.branchId,
    );
    return sale;
  }

  private onlyPayment(sale: SaleForPayment) {
    if (sale.payments.length !== 1) throw new ConflictException('Sale must have exactly one payment');
    return sale.payments[0];
  }

  async initialize(userId: string, dto: InitializePaystackDto) {
    const sale = await this.getSaleForPayment(userId, dto.saleId);
    if (sale.status !== 'PENDING_PAYMENT') throw new ConflictException('Sale is not pending payment');
    const payment = this.onlyPayment(sale);
    const channels = CHANNELS[payment.channel];
    if (!channels) throw new BadRequestException(
      'Paystack hosted test checkout is available for card, bank transfer and USSD only; cash uses cash confirmation',
    );
    if (payment.status !== 'PENDING') throw new ConflictException('Payment is not pending');
    if (sale.currency !== 'NGN' || koboFromDecimal(sale.total.toString()) <= 0n) {
      throw new BadRequestException('This checkout only accepts positive NGN sales');
    }
    this.testKey();
    const expectedReference = payment.reference;
    if (!validPaystackReference(expectedReference)) {
      throw new ConflictException('Invalid saved payment reference');
    }
    // An existing hosted checkout can be safely reused, never initialized again.
    if (payment.provider === PROVIDER && payment.providerReference === expectedReference) {
      const initial = await this.prisma.paymentEvent.findFirst({
        where: { paymentId: payment.id, providerEventId: 'initialization' },
      });
      const payload = initial?.payload;
      const url = payload && typeof payload === 'object' && !Array.isArray(payload) &&
        'authorizationUrl' in payload ? payload.authorizationUrl : null;
      if (validCheckoutUrl(url)) {
        return { saleId: sale.id, authorizationUrl: url, reference: expectedReference, testMode: true };
      }
      throw new ConflictException(
        'Paystack initialization was attempted but checkout is unavailable. Verify or reconcile the sale before retrying.',
      );
    }
    if (payment.provider || payment.providerReference) {
      throw new ConflictException('Payment is already assigned to a different provider');
    }

    // Atomic reservation prevents concurrent initialization from creating duplicate charges.
    const claimed = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: 'PENDING', provider: null, providerReference: null },
      data: { provider: PROVIDER, providerReference: expectedReference },
    });
    if (claimed.count !== 1) {
      throw new ConflictException('Checkout already being initialized. Refresh this sale to retry.');
    }

    const origin = (process.env.FRONTEND_URL ?? '').trim().replace(/\/$/, '');
    if (!/^https:\/\/[A-Za-z0-9.-]+(?::443)?$/.test(origin)) {
      throw new ServiceUnavailableException('A valid HTTPS FRONTEND_URL must be configured on the backend');
    }
    const totalKobo = koboFromDecimal(sale.total.toString());
    if (totalKobo > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new BadRequestException('Transaction amount is too high');
    }
    const { ok, data } = await this.paystackRequest('/transaction/initialize', 'POST', {
      email: dto.email.trim().toLowerCase(),
      amount: totalKobo.toString(),
      currency: 'NGN',
      reference: expectedReference,
      channels,
      callback_url: origin + '/sales/payment?saleId=' + encodeURIComponent(sale.id),
      metadata: JSON.stringify({ saleReference: sale.reference, businessId: sale.businessId }),
    });

    const response = data as { status?: unknown; data?: { authorization_url?: unknown; reference?: unknown } } | null;
    if (!ok || response?.status !== true) {
      // Definite Paystack HTTP rejection; safe to release reservation.
      await this.prisma.payment.updateMany({
        where: { id: payment.id, status: 'PENDING', provider: PROVIDER, providerReference: expectedReference },
        data: { provider: null, providerReference: null },
      });
      throw new BadGatewayException('Paystack could not initialize test checkout. Check your test account configuration.');
    }
    const authorizationUrl = response?.data?.authorization_url;
    if (response.data?.reference !== expectedReference || !validCheckoutUrl(authorizationUrl)) {
      throw new BadGatewayException('Paystack returned an unexpected checkout response');
    }
    await this.prisma.paymentEvent.create({
      data: {
        paymentId: payment.id,
        providerEventId: 'initialization',
        eventType: 'paystack.test.initialized',
        // Store ONLY a retryable checkout URL and reference, never customer/card data or API keys.
        payload: { authorizationUrl, reference: expectedReference, testMode: true },
      },
    });
    return { saleId: sale.id, authorizationUrl, reference: expectedReference, testMode: true };
  }

  async verifyForUser(userId: string, saleId: string) {
    const sale = await this.getSaleForPayment(userId, saleId);
    const payment = this.onlyPayment(sale);
    if (payment.provider !== PROVIDER || payment.providerReference !== payment.reference) {
      throw new BadRequestException('This sale has no initialized Paystack test payment');
    }
    return this.verifyReference(payment.reference);
  }

  private async verifyReference(reference: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
      include: { sale: { include: { items: true } } },
    });
    if (!payment || payment.provider !== PROVIDER || payment.providerReference !== reference) {
      throw new NotFoundException('Paystack test payment not found');
    }
    const { ok, data } = await this.paystackRequest(
      '/transaction/verify/' + encodeURIComponent(reference), 'GET',
    );
    const response = data as { status?: unknown; data?: Partial<Verification> } | null;
    if (!ok || response?.status !== true || !response.data) {
      throw new BadGatewayException('Paystack could not verify this payment at the moment');
    }
    const verified = response.data;
    const sale = payment.sale;
    // Always compare Paystack's independently returned status, reference, amount,
    // currency AND environment with the immutable server-calculated sale total.
    if (verified.reference !== reference || verified.domain !== 'test' ||
        verified.currency !== 'NGN' || sale.currency !== 'NGN' ||
        !Number.isSafeInteger(verified.amount) || (verified.amount ?? -1) <= 0 ||
        BigInt(verified.amount!) !== koboFromDecimal(sale.total.toString()) ||
        BigInt(verified.amount!) !== koboFromDecimal(payment.amount.toString())) {
      throw new ConflictException('Paystack verification does not match the saved NGN test sale');
    }

    if (verified.status !== 'success') {
      return {
        saleId: sale.id, saleStatus: sale.status, paymentStatus: payment.status,
        providerStatus: verified.status ?? 'unknown', testMode: true, needsAttention: false,
      };
    }
    if (!verified.id || !/^[0-9]+$/.test(String(verified.id))) {
      throw new ConflictException('Paystack verification has no valid transaction ID');
    }
    const paidAt = verified.paid_at && !Number.isNaN(Date.parse(verified.paid_at))
      ? new Date(verified.paid_at) : new Date();
    let needsAttention = false;
    try {
      await this.prisma.$transaction(async (tx) => {
        const fresh = await tx.sale.findUnique({
          where: { id: sale.id }, include: { items: true, payments: true },
        });
        if (!fresh) throw new NotFoundException('Sale not found');
        const selected = fresh.payments.find((item) => item.id === payment.id);
        if (!selected || selected.provider !== PROVIDER || selected.providerReference !== reference) {
          throw new ConflictException('Payment changed during verification');
        }
        if (fresh.status === 'PAID' && selected.status === 'SUCCEEDED') return;
        if (fresh.status !== 'PENDING_PAYMENT') {
          throw new ConflictException('Sale is not eligible for payment confirmation');
        }
        const claim = await tx.sale.updateMany({
          where: { id: fresh.id, status: 'PENDING_PAYMENT' }, data: { status: 'PAID' },
        });
        if (claim.count !== 1) throw new ConflictException('Sale confirmation already in progress');
        for (const line of [...fresh.items].sort((a, b) => a.productId.localeCompare(b.productId))) {
          const stock = await tx.stockBalance.updateMany({
            where: {
              productId: line.productId, branchId: fresh.branchId,
              quantity: { gte: line.quantity },
            },
            data: { quantity: { decrement: line.quantity } },
          });
          if (stock.count !== 1) throw new ConflictException('Insufficient stock to fulfill paid sale');
          await tx.stockMovement.create({
            data: {
              productId: line.productId, branchId: fresh.branchId,
              delta: -line.quantity, reason: 'SALE', reference: fresh.reference,
            },
          });
        }
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'SUCCEEDED', confirmedAt: paidAt },
        });
        await tx.paymentEvent.createMany({
          data: [{
            paymentId: payment.id,
            providerEventId: 'verified-success-' + String(verified.id),
            eventType: 'paystack.test.verified',
            payload: {
              reference, transactionId: String(verified.id),
              amountKobo: verified.amount!, currency: verified.currency!,
              gatewayStatus: 'success', environment: 'test',
            },
          }],
          skipDuplicates: true,
        });
      });
    } catch (error) {
      if (!(error instanceof ConflictException) ||
          !error.message.includes('Insufficient stock')) throw error;
      // Paystack has confirmed payment even though Kassa cannot safely fulfill it.
      // Record the verified payment separately; keep sale PENDING_PAYMENT and prevent a paid receipt.
      needsAttention = true;
      await this.prisma.payment.updateMany({
        where: { id: payment.id, provider: PROVIDER, status: { in: ['PENDING', 'SUCCEEDED'] } },
        data: { status: 'SUCCEEDED', confirmedAt: paidAt },
      });
      await this.prisma.paymentEvent.createMany({
        data: [{
          paymentId: payment.id,
          providerEventId: 'stock-review-' + String(verified.id),
          eventType: 'paystack.test.fulfillment_needs_review',
          payload: { reference, transactionId: String(verified.id), reason: 'INSUFFICIENT_STOCK' },
        }],
        skipDuplicates: true,
      });
    }
    const updated = await this.prisma.sale.findUnique({
      where: { id: sale.id }, select: { status: true, payments: { select: { status: true } } },
    });
    return {
      saleId: sale.id,
      saleStatus: updated?.status ?? sale.status,
      paymentStatus: updated?.payments[0]?.status ?? payment.status,
      providerStatus: 'success',
      testMode: true,
      needsAttention: needsAttention || updated?.status !== 'PAID',
    };
  }

  async handleSignedWebhook(payload: unknown) {
    if (!payload || typeof payload !== 'object') return { received: true, ignored: true };
    const event = payload as { event?: unknown; data?: { reference?: unknown } };
    if (event.event !== 'charge.success' || !validPaystackReference(event.data?.reference)) {
      return { received: true, ignored: true };
    }
    // Never trust the webhook payload's amount or success status: use server-to-server verification.
    const payment = await this.prisma.payment.findUnique({
      where: { reference: event.data.reference }, select: { provider: true },
    });
    if (payment?.provider !== PROVIDER) return { received: true, ignored: true };
    await this.verifyReference(event.data.reference);
    return { received: true };
  }

  async reconcile(userId: string, dto: ReconcilePaystackDto) {
    const membership = await this.prisma.businessMembership.findUnique({
      where: { businessId_userId: { businessId: dto.businessId, userId } },
      select: { role: { select: { name: true } } },
    });
    if (membership?.role.name !== 'Owner') {
      throw new ForbiddenException('Only the business owner can reconcile payments');
    }
    await requireBusinessPermission(
      this.prisma, userId, dto.businessId, 'Manage sales & transactions', dto.branchId,
    );
    const payments = await this.prisma.payment.findMany({
      where: {
        businessId: dto.businessId, provider: PROVIDER,
        status: { in: ['PENDING', 'SUCCEEDED'] },
        sale: { branchId: dto.branchId, status: 'PENDING_PAYMENT' },
      },
      orderBy: { createdAt: 'asc' },
      take: dto.limit ?? 5,
      select: { reference: true },
    });
    const results = await Promise.all(payments.map(async (item) => {
      try {
        const verified = await this.verifyReference(item.reference);
        return { reference: item.reference, ...verified };
      } catch (error) {
        return {
          reference: item.reference, providerStatus: 'verification_error',
          error: error instanceof Error ? error.message : 'Verification failed',
        };
      }
    }));
    return {
      testMode: true, checked: results.length,
      paid: results.filter((item) => item.providerStatus === 'success' && item.saleStatus === 'PAID').length,
      needsReview: results.filter((item) => item.providerStatus === 'verification_error' ||
        item.needsAttention).length,
      results,
    };
  }
}
