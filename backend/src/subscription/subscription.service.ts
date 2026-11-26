import {
  BadGatewayException, BadRequestException, ConflictException,
  ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  SUBSCRIPTION_PLANS, SUBSCRIPTION_ENTITLEMENTS, PAID_PLAN_CODES,
  businessEntitlement, featureGatesEnabled,
} from './subscription-access';

type PaystackResponse = {
  status?: boolean;
  data?: {
    authorization_url?: string; reference?: string;
    id?: number | string; status?: string; domain?: string; amount?: number;
    currency?: string; paid_at?: string | null;
  };
};

function trustedCheckoutUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.origin === 'https://checkout.paystack.com' &&
      !parsed.username && !parsed.password;
  } catch { return false; }
}

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Approved catalog: server is the sole authority for price and term. */
  private plans() {
    return SUBSCRIPTION_PLANS;
  }

  private gateway(): { secret: string; domain: 'test' | 'live' } {
    const secret = process.env.PAYSTACK_SECRET_KEY?.trim() ?? '';
    if (secret.startsWith('sk_test_') && secret.length >= 16) {
      return { secret, domain: 'test' };
    }
    if (secret.startsWith('sk_live_') && secret.length >= 16 &&
        process.env.KASSA_BILLING_LIVE_ENABLED === 'true' &&
        process.env.PAYSTACK_WEBHOOK_SECRET?.startsWith('whsec_')) {
      return { secret, domain: 'live' };
    }
    throw new ServiceUnavailableException(
      'KASSA subscription payment is not configured. A valid Paystack key and billing setup are required.',
    );
  }

  private async owner(userId: string, businessId: string) {
    const membership = await this.prisma.businessMembership.findUnique({
      where: { businessId_userId: { userId, businessId } },
      select: { role: { select: { name: true } } },
    });
    if (membership?.role.name !== 'Owner') {
      throw new ForbiddenException('Only the business owner can manage KASSA subscription billing');
    }
  }

  private async request(route: string, method: 'GET' | 'POST', body?: object) {
    const { secret } = this.gateway();
    let response: Response;
    try {
      response = await fetch('https://api.paystack.co' + route, {
        method, headers: { Authorization: 'Bearer ' + secret,
          ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(12_000), cache: 'no-store',
      });
    } catch {
      // Outcome may be unknown, so do not mark a reserved charge failed.
      throw new BadGatewayException('Paystack connection failed. Check billing status before trying again.');
    }
    const payload: unknown = await response.json().catch(() => null);
    return { httpOk: response.ok, payload: payload as PaystackResponse | null };
  }

  async status(userId: string, businessId: string) {
    await this.owner(userId, businessId);
    const charges = await this.prisma.subscriptionCharge.findMany({
      where: { businessId }, orderBy: { createdAt: 'desc' }, take: 40,
    });
    const now = new Date();
    const current = await this.prisma.subscriptionCharge.findFirst({
      where: { businessId, status: 'SUCCEEDED', planCode: { in: PAID_PLAN_CODES },
        periodEnd: { gt: now }, OR: [{ periodStart: null }, { periodStart: { lte: now } }] },
      orderBy: { periodEnd: 'desc' },
    });
    const scheduled = await this.prisma.subscriptionCharge.findFirst({
      where: { businessId, status: 'SUCCEEDED', planCode: { in: PAID_PLAN_CODES }, periodStart: { gt: now } },
      orderBy: { periodStart: 'asc' },
    });
    const latest = charges.filter(item => item.status === 'SUCCEEDED')
      .sort((a, b) => (b.periodEnd?.getTime() ?? 0) - (a.periodEnd?.getTime() ?? 0))[0];
    const pending = charges.find(item => item.status === 'PENDING') ?? null;
    let configured = false;
    let environment: 'test' | 'live' | null = null;
    try { environment = this.gateway().domain; configured = this.plans().length > 0; } catch { /* setup incomplete */ }
    const toCharge = (charge: typeof charges[number]) => ({
      id: charge.id, reference: charge.reference, planName: charge.planName,
      amountKobo: charge.amountKobo, durationDays: charge.durationDays,
      status: charge.status, environment: charge.gatewayDomain,
      confirmedAt: charge.confirmedAt?.toISOString() ?? null,
      periodEnd: charge.periodEnd?.toISOString() ?? null,
      createdAt: charge.createdAt.toISOString(),
    });
    return {
      configured, environment, currency: 'NGN',
      plans: this.plans().map(plan => ({
        ...plan,
        testPricing: false,
        entitlement: SUBSCRIPTION_ENTITLEMENTS[plan.tier],
      })),
      entitlement: await businessEntitlement(this.prisma, businessId),
      featureRestrictionsEnabled: featureGatesEnabled(),
      subscription: current ? {
        status: 'ACTIVE' as const, planName: current.planName,
        expiresAt: current.periodEnd?.toISOString() ?? null,
      } : latest ? {
        status: 'EXPIRED' as const, planName: latest.planName,
        expiresAt: latest.periodEnd?.toISOString() ?? null,
      } : { status: 'NOT_ACTIVE' as const, planName: null, expiresAt: null },
      scheduled: scheduled ? { planName: scheduled.planName,
        startsAt: scheduled.periodStart?.toISOString() ?? null } : null,
      pending: pending ? { ...toCharge(pending),
        checkoutUrl: trustedCheckoutUrl(pending.checkoutUrl) ? pending.checkoutUrl : null } : null,
      history: charges.map(toCharge),
      automaticRenewal: false,
    };
  }

  async initialize(userId: string, businessId: string, planCode: string) {
    await this.owner(userId, businessId);
    const { domain } = this.gateway();
    const plan = this.plans().find(item => item.code === planCode);
    if (!plan) throw new BadRequestException('Choose a configured subscription plan');
    const pending = await this.prisma.subscriptionCharge.findFirst({
      where: { businessId, status: 'PENDING' },
    });
    if (pending) {
      if (trustedCheckoutUrl(pending.checkoutUrl)) {
        return { reference: pending.reference, authorizationUrl: pending.checkoutUrl,
          environment: pending.gatewayDomain };
      }
      throw new ConflictException(
        'A billing attempt is pending verification. Do not start another payment; contact KASSA support if it cannot be resolved.',
      );
    }
    const owner = await this.prisma.user.findUnique({
      where: { id: userId }, select: { email: true },
    });
    if (!owner?.email) throw new BadRequestException('Your owner account needs a valid email');
    const frontend = (process.env.FRONTEND_URL ?? '').trim().replace(/\/$/, '');
    if (!/^https:\/\/[A-Za-z0-9.-]+(?::443)?$/.test(frontend)) {
      throw new ServiceUnavailableException('A public HTTPS FRONTEND_URL is required for subscription checkout');
    }
    const ref = 'KSB-' + randomUUID();
    // A partial unique DB index permits at most one pending charge per business.
    try {
      await this.prisma.subscriptionCharge.create({
        data: { businessId, planCode: plan.code, planName: plan.name,
          durationDays: plan.durationDays, amountKobo: plan.amountKobo,
          reference: ref, gatewayDomain: domain },
      });
    } catch (cause) {
      if ((cause as { code?: string })?.code === 'P2002') {
        throw new ConflictException('A billing attempt is already in progress');
      }
      throw cause;
    }

    const { httpOk, payload } = await this.request('/transaction/initialize', 'POST', {
      email: owner.email,
      amount: String(plan.amountKobo), currency: 'NGN', reference: ref,
      callback_url: frontend + '/settings?billing=return',
      metadata: JSON.stringify({ purpose: 'kassa_subscription', businessId, planCode: plan.code }),
    });
    if (!httpOk || payload?.status !== true) {
      await this.prisma.subscriptionCharge.updateMany({
        where: { reference: ref, status: 'PENDING' }, data: { status: 'FAILED' },
      });
      throw new BadGatewayException('Paystack could not initialize KASSA subscription checkout');
    }
    const url = payload.data?.authorization_url;
    if (payload.data?.reference !== ref || !trustedCheckoutUrl(url)) {
      throw new BadGatewayException('Paystack returned an invalid checkout; do not retry this charge blindly');
    }
    await this.prisma.subscriptionCharge.update({
      where: { reference: ref }, data: { checkoutUrl: url },
    });
    return { reference: ref, authorizationUrl: url, environment: domain };
  }

  async verify(userId: string, businessId: string, reference: string) {
    await this.owner(userId, businessId);
    const charge = await this.prisma.subscriptionCharge.findFirst({
      where: { businessId, reference },
    });
    if (!charge) throw new NotFoundException('Billing reference not found in your business');
    return this.verifyReference(reference);
  }

  /** Signed webhooks and owner verification both use server-side verification. */
  async verifyReference(reference: string) {
    if (!/^KSB-[0-9a-f-]{36}$/i.test(reference)) {
      throw new BadRequestException('Invalid KASSA subscription reference');
    }
    const charge = await this.prisma.subscriptionCharge.findUnique({ where: { reference } });
    if (!charge) throw new NotFoundException('Unknown subscription charge');
    if (charge.status === 'SUCCEEDED') {
      return { reference, status: 'SUCCEEDED', expiresAt: charge.periodEnd?.toISOString() ?? null };
    }
    if (charge.status !== 'PENDING') {
      return { reference, status: charge.status, expiresAt: null };
    }
    const { domain } = this.gateway();
    if (domain !== charge.gatewayDomain) throw new ConflictException('Billing environment mismatch');
    const { httpOk, payload } = await this.request(
      '/transaction/verify/' + encodeURIComponent(reference), 'GET');
    const data = payload?.data;
    if (!httpOk || payload?.status !== true || !data) {
      throw new BadGatewayException('Could not verify this KASSA subscription payment');
    }
    if (data.reference !== reference || data.domain !== charge.gatewayDomain ||
        data.currency !== charge.currency || data.currency !== 'NGN' ||
        !Number.isSafeInteger(data.amount) || data.amount !== charge.amountKobo) {
      throw new ConflictException('Paystack payment details do not match the subscription invoice');
    }
    if (data.status !== 'success') {
      // A definitively unsuccessful transaction can be replaced by a new checkout.
      if (data.status === 'failed' || data.status === 'abandoned') {
        await this.prisma.subscriptionCharge.updateMany({
          where: { reference, status: 'PENDING' }, data: { status: 'FAILED' },
        });
        return { reference, status: 'FAILED', expiresAt: null };
      }
      return { reference, status: data.status ?? 'PENDING', expiresAt: null };
    }
    if (!data.id || !/^\d+$/.test(String(data.id))) {
      throw new ConflictException('Paystack returned an invalid transaction ID');
    }
    const paidAt = data.paid_at && Number.isFinite(Date.parse(data.paid_at))
      ? new Date(data.paid_at) : new Date();
    // Per-business pending uniqueness means there is at most one concurrent
    // payment being fulfilled. The conditional update prevents double extension.
    await this.prisma.$transaction(async tx => {
      const current = await tx.subscriptionCharge.findUnique({ where: { reference } });
      if (!current || current.status !== 'PENDING') return;
      const latest = await tx.subscriptionCharge.findFirst({
        where: { businessId: current.businessId, status: 'SUCCEEDED' },
        orderBy: { periodEnd: 'desc' }, select: { periodEnd: true },
      });
      const start = latest?.periodEnd && latest.periodEnd > paidAt ? latest.periodEnd : paidAt;
      const end = new Date(start.getTime() + current.durationDays * 86_400_000);
      await tx.subscriptionCharge.updateMany({
        where: { id: current.id, status: 'PENDING' },
        data: { status: 'SUCCEEDED', providerTxnId: String(data.id),
          confirmedAt: paidAt, periodStart: start, periodEnd: end },
      });
    });
    const saved = await this.prisma.subscriptionCharge.findUnique({ where: { reference } });
    return { reference, status: saved?.status ?? 'PENDING',
      expiresAt: saved?.periodEnd?.toISOString() ?? null };
  }
}
