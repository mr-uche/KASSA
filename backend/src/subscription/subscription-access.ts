import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

export const BILLING_CYCLES = [
  { code: 'monthly', label: 'Monthly', months: 1, durationDays: 30, discountPercent: 0 },
  { code: 'quarterly', label: 'Quarterly', months: 3, durationDays: 90, discountPercent: 10 },
  { code: 'annual', label: 'Annually', months: 12, durationDays: 365, discountPercent: 20 },
] as const;
export const PAID_TIERS = [
  { code: 'starter', name: 'Starter', monthlyKobo: 200_000, maxBranches: 1, maxStaff: 3 },
  { code: 'growth', name: 'Growth', monthlyKobo: 500_000, maxBranches: 2, maxStaff: 10 },
  { code: 'business', name: 'Business', monthlyKobo: 1_000_000, maxBranches: 5, maxStaff: 25 },
  { code: 'enterprise', name: 'Enterprise', monthlyKobo: 1_800_000, maxBranches: 10, maxStaff: 50 },
] as const;
export type PaidTier = typeof PAID_TIERS[number]['code'];
export type BillingCycle = typeof BILLING_CYCLES[number]['code'];
export type SubscriptionTier = 'free' | 'monthly' | 'quarterly' | 'annual' | PaidTier;
export type PremiumFeature = 'customers' | 'reports' | 'grossProfit' | 'dataExport';
export type SubscriptionEntitlement = {
  tier: SubscriptionTier;
  maxBranches: number;
  maxStaff: number;
  ownerIncluded: boolean;
  features: Record<PremiumFeature, boolean>;
};
const fullFeatures = { customers: true, reports: true, grossProfit: true, dataExport: true };
function paidEntitlement(tier: typeof PAID_TIERS[number]): SubscriptionEntitlement {
  return { tier: tier.code, maxBranches: tier.maxBranches, maxStaff: tier.maxStaff,
    ownerIncluded: false, features: { ...fullFeatures } };
}
// Legacy paid charges retain their purchased entitlements until expiration.
export const SUBSCRIPTION_ENTITLEMENTS: Record<SubscriptionTier, SubscriptionEntitlement> = {
  free: { tier: 'free', maxBranches: 1, maxStaff: 1, ownerIncluded: true,
    features: { customers: false, reports: false, grossProfit: false, dataExport: false } },
  monthly: { tier: 'monthly', maxBranches: 1, maxStaff: 3, ownerIncluded: true,
    features: { customers: true, reports: false, grossProfit: false, dataExport: false } },
  quarterly: { tier: 'quarterly', maxBranches: 3, maxStaff: 15, ownerIncluded: true,
    features: { customers: true, reports: true, grossProfit: false, dataExport: false } },
  annual: { tier: 'annual', maxBranches: 10, maxStaff: 50, ownerIncluded: true,
    features: { ...fullFeatures } },
  starter: paidEntitlement(PAID_TIERS[0]),
  growth: paidEntitlement(PAID_TIERS[1]),
  business: paidEntitlement(PAID_TIERS[2]),
  enterprise: paidEntitlement(PAID_TIERS[3]),
};
export const SUBSCRIPTION_PLANS = PAID_TIERS.flatMap(tier => BILLING_CYCLES.map(cycle => ({
  code: tier.code + '_' + cycle.code,
  name: tier.name + ' · ' + cycle.label,
  tier: tier.code,
  tierName: tier.name,
  billingCycle: cycle.code,
  amountKobo: tier.monthlyKobo * cycle.months * (100 - cycle.discountPercent) / 100,
  durationDays: cycle.durationDays,
  discountPercent: cycle.discountPercent,
  savingsKobo: tier.monthlyKobo * cycle.months * cycle.discountPercent / 100,
  monthlyEquivalentKobo: tier.monthlyKobo * (100 - cycle.discountPercent) / 100,
})));
const LEGACY_PLAN_CODES = ['monthly', 'quarterly', 'annual'] as const;
export const PAID_PLAN_CODES = [...LEGACY_PLAN_CODES, ...SUBSCRIPTION_PLANS.map(p => p.code)];
export function tierForPlan(code: string): SubscriptionTier {
  const plan = SUBSCRIPTION_PLANS.find(p => p.code === code);
  if (plan) return plan.tier;
  return LEGACY_PLAN_CODES.find(p => p === code) ?? 'free';
}

export function featureGatesEnabled(): boolean {
  // Safe rollout: don't lock out existing production businesses on deployment.
  // Enable only after migration, subscriptions and account access are tested.
  return process.env.KASSA_SUBSCRIPTION_FEATURE_GATES_ENABLED === 'true';
}

export async function businessEntitlement(prisma: PrismaService, businessId: string) {
  const now = new Date();
  const active = await prisma.subscriptionCharge.findFirst({
    where: {
      businessId, status: 'SUCCEEDED', periodEnd: { gt: now },
      planCode: { in: PAID_PLAN_CODES },
      OR: [{ periodStart: null }, { periodStart: { lte: now } }],
    },
    orderBy: { periodEnd: 'desc' },
    select: { planCode: true, periodEnd: true },
  });
  const tier = tierForPlan(active?.planCode ?? 'free');
  return { ...SUBSCRIPTION_ENTITLEMENTS[tier], expiresAt: active?.periodEnd?.toISOString() ?? null };
}

const labels: Record<PremiumFeature, string> = {
  customers: 'Customer management',
  reports: 'Reports & Analytics',
  grossProfit: 'Gross-profit overview',
  dataExport: 'Data Export',
};

export async function requireSubscriptionFeature(
  prisma: PrismaService, businessId: string, feature: PremiumFeature,
): Promise<void> {
  if (!featureGatesEnabled()) return;
  const entitlement = await businessEntitlement(prisma, businessId);
  if (!entitlement.features[feature]) {
    throw new ForbiddenException(labels[feature] + ' requires a higher active KASSA subscription plan.');
  }
}

export async function requireSubscriptionCapacity(
  prisma: PrismaService, businessId: string, resource: 'branches' | 'staff',
): Promise<void> {
  if (!featureGatesEnabled()) return;
  const entitlement = await businessEntitlement(prisma, businessId);
  const max = resource === 'branches' ? entitlement.maxBranches : entitlement.maxStaff;
  // Staff invitations reserve capacity until revoked, expired or accepted.
  const count = resource === 'branches' ? await prisma.branch.count({
    where: { businessId },
  }) : (await prisma.businessMembership.count({ where: { businessId,
      ...(entitlement.ownerIncluded ? {} : { role: { name: { not: 'Owner' } } }),
    } })) +
    (await prisma.staffInvitation.count({
      where: { businessId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    }));
  if (count >= max) {
    throw new ForbiddenException(
      'Your ' + entitlement.tier + ' subscription permits at most ' +
      max + (resource === 'branches' ? ' branch(es).' :
        entitlement.ownerIncluded ? ' staff account(s), including the owner.' : ' staff account(s), excluding the owner.') +
      ' Upgrade your subscription to add more.',
    );
  }
}
