const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SUBSCRIPTION_PLANS, SUBSCRIPTION_ENTITLEMENTS, businessEntitlement, tierForPlan,
  requireSubscriptionFeature, requireSubscriptionCapacity,
} = require('../src/subscription/subscription-access');

test('approved catalog has twelve unique plans with exact prices in kobo and durations', () => {
  assert.equal(new Set(SUBSCRIPTION_PLANS.map(p => p.code)).size, 12);
  const prices = {
    starter: [200000, 540000, 1920000],
    growth: [500000, 1350000, 4800000],
    business: [1000000, 2700000, 9600000],
    enterprise: [1800000, 4860000, 17280000],
  };
  for (const [tier, amounts] of Object.entries(prices)) {
    const plans = SUBSCRIPTION_PLANS.filter(p => p.tier === tier);
    assert.deepEqual(plans.map(p => p.amountKobo), amounts);
    assert.deepEqual(plans.map(p => p.durationDays), [30, 90, 365]);
    assert.deepEqual(plans.map(p => p.discountPercent), [0, 10, 20]);
    for (const p of plans) assert.equal(tierForPlan(p.code), tier);
  }
});

test('paid capacity and all core premium features depend on tier, not billing cycle', () => {
  const limits = { starter: [1, 3], growth: [2, 10], business: [5, 25], enterprise: [10, 50] };
  for (const [tier, expected] of Object.entries(limits)) {
    const e = SUBSCRIPTION_ENTITLEMENTS[tier];
    assert.deepEqual([e.maxBranches, e.maxStaff], expected);
    assert.equal(e.ownerIncluded, false);
    assert.equal(Object.values(e.features).every(Boolean), true);
  }
  assert.equal(SUBSCRIPTION_ENTITLEMENTS.free.maxStaff, 1);
  assert.equal(SUBSCRIPTION_ENTITLEMENTS.monthly.ownerIncluded, true);
  assert.equal(SUBSCRIPTION_ENTITLEMENTS.quarterly.features.grossProfit, false);
  assert.equal(SUBSCRIPTION_ENTITLEMENTS.annual.maxStaff, 50);
});

test('expired or missing charges get the free tier; current paid tier is respected', async () => {
  let charge = null;
  const prisma = { subscriptionCharge: { findFirst: async () => charge } };
  assert.equal((await businessEntitlement(prisma, 'business')).tier, 'free');
  charge = { planCode: 'quarterly', periodEnd: new Date(Date.now() + 86400000) };
  assert.equal((await businessEntitlement(prisma, 'business')).tier, 'quarterly');
  charge = null; // Database filters out expired charges
  assert.equal((await businessEntitlement(prisma, 'business')).tier, 'free');
});

test('premium endpoints deny unentitled businesses when enforcement is on', async () => {
  const old = process.env.KASSA_SUBSCRIPTION_FEATURE_GATES_ENABLED;
  process.env.KASSA_SUBSCRIPTION_FEATURE_GATES_ENABLED = 'true';
  try {
    let charge = { planCode: 'quarterly', periodEnd: new Date(Date.now() + 86400000) };
    const prisma = { subscriptionCharge: { findFirst: async () => charge } };
    await requireSubscriptionFeature(prisma, 'business', 'reports');
    await assert.rejects(requireSubscriptionFeature(prisma, 'business', 'grossProfit'),
      /higher active KASSA subscription/);
    charge = { planCode: 'annual', periodEnd: new Date(Date.now() + 86400000) };
    await requireSubscriptionFeature(prisma, 'business', 'grossProfit');
    await requireSubscriptionFeature(prisma, 'business', 'dataExport');
    charge = null;
    await assert.rejects(requireSubscriptionFeature(prisma, 'business', 'customers'),
      /higher active KASSA subscription/);
  } finally {
    if (old === undefined) delete process.env.KASSA_SUBSCRIPTION_FEATURE_GATES_ENABLED;
    else process.env.KASSA_SUBSCRIPTION_FEATURE_GATES_ENABLED = old;
  }
});

test('owner and pending invites count toward staff capacity; branches have a hard ceiling', async () => {
  const old = process.env.KASSA_SUBSCRIPTION_FEATURE_GATES_ENABLED;
  process.env.KASSA_SUBSCRIPTION_FEATURE_GATES_ENABLED = 'true';
  try {
    const prisma = {
      subscriptionCharge: { findFirst: async () => ({
        planCode: 'monthly', periodEnd: new Date(Date.now() + 86400000),
      }) },
      businessMembership: { count: async () => 2 },
      staffInvitation: { count: async () => 1 },
      branch: { count: async () => 1 },
    };
    await assert.rejects(requireSubscriptionCapacity(prisma, 'business', 'staff'),
      /at most 3 staff account/);
    await assert.rejects(requireSubscriptionCapacity(prisma, 'business', 'branches'),
      /at most 1 branch/);
  } finally {
    if (old === undefined) delete process.env.KASSA_SUBSCRIPTION_FEATURE_GATES_ENABLED;
    else process.env.KASSA_SUBSCRIPTION_FEATURE_GATES_ENABLED = old;
  }
});

test('new paid tiers exclude owner, reserve pending staff invitations and ignore future periods', async () => {
  const old = process.env.KASSA_SUBSCRIPTION_FEATURE_GATES_ENABLED;
  process.env.KASSA_SUBSCRIPTION_FEATURE_GATES_ENABLED = 'true';
  try {
    let staff = 2;
    const prisma = {
      subscriptionCharge: { findFirst: async ({ where }) => {
        assert.ok(where.OR.some(p => p.periodStart?.lte instanceof Date));
        assert.ok(where.planCode.in.includes('starter_annual'));
        return { planCode: 'starter_annual', periodEnd: new Date(Date.now() + 86400000) };
      } },
      businessMembership: { count: async ({ where }) => {
        assert.deepEqual(where.role, { name: { not: 'Owner' } });
        return staff;
      } },
      staffInvitation: { count: async () => 0 },
      branch: { count: async () => 1 },
    };
    await requireSubscriptionCapacity(prisma, 'business', 'staff');
    staff = 3;
    await assert.rejects(requireSubscriptionCapacity(prisma, 'business', 'staff'), /excluding the owner/);
    await assert.rejects(requireSubscriptionCapacity(prisma, 'business', 'branches'), /at most 1 branch/);
    await requireSubscriptionFeature(prisma, 'business', 'dataExport');
  } finally {
    if (old === undefined) delete process.env.KASSA_SUBSCRIPTION_FEATURE_GATES_ENABLED;
    else process.env.KASSA_SUBSCRIPTION_FEATURE_GATES_ENABLED = old;
  }
});
