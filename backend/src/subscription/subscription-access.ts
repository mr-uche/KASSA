import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

/** Placeholder pricing for testing ONLY. No real price has been approved. */
export const TEST_SUBSCRIPTION_PLANS = [
  { code: 'monthly', name: 'Monthly', amountKobo: 200_000, durationDays: 30 },
  { code: 'quarterly', name: 'Quarterly', amountKobo: 500_000, durationDays: 90 },
  { code: 'annual', name: 'Annual', amountKobo: 1_800_000, durationDays: 365 },
] as const;

export type SubscriptionTier = 'free' | 'monthly' | 'quarterly' | 'annual';
export type PremiumFeature = 'customers' | 'reports' | 'grossProfit' | 'dataExport';

export type SubscriptionEntitlement = {
  tier: SubscriptionTier;
  maxBranches: number;
  maxStaff: number;
  features: Record<PremiumFeature, boolean>;
};

/** Max staff includes the business owner. Limits apply to new additions, not deletion of existing records. */
export const SUBSCRIPTION_ENTITLEMENTS: Record<SubscriptionTier, SubscriptionEntitlement> = {
  free: { tier: 'free', maxBranches: 1, maxStaff: 1,
    features: { customers: false, reports: false, grossProfit: false, dataExport: false } },
  monthly: { tier: 'monthly', maxBranches: 1, maxStaff: 3,
    features: { customers: true, reports: false, grossProfit: false, dataExport: false } },
  quarterly: { tier: 'quarterly', maxBranches: 3, maxStaff: 15,
    features: { customers: true, reports: true, grossProfit: false, dataExport: false } },
  annual: { tier: 'annual', maxBranches: 10, maxStaff: 50,
    features: { customers: true, reports: true, grossProfit: true, dataExport: true } },
};

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
      planCode: { in: ['monthly', 'quarterly', 'annual'] },
    },
    orderBy: { periodEnd: 'desc' },
    select: { planCode: true, periodEnd: true },
  });
  const tier = (active?.planCode ?? 'free') as SubscriptionTier;
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
  }) : (await prisma.businessMembership.count({ where: { businessId } })) +
    (await prisma.staffInvitation.count({
      where: { businessId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    }));
  if (count >= max) {
    throw new ForbiddenException(
      'Your ' + entitlement.tier + ' subscription permits at most ' +
      max + (resource === 'branches' ? ' branch(es).' : ' staff account(s), including the owner.') +
      ' Upgrade your subscription to add more.',
    );
  }
}
