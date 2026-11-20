const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TEST_SUBSCRIPTION_PLANS, SUBSCRIPTION_ENTITLEMENTS, businessEntitlement,
  requireSubscriptionFeature, requireSubscriptionCapacity,
} = require('../src/subscription/subscription-access');

test('pilot pricing has exactly the three named tiers and fixed lengths', () => {
  assert.deepEqual(TEST_SUBSCRIPTION_PLANS.map(x => [x.code, x.durationDays]), [
    ['monthly', 30], ['quarterly', 90], ['annual', 365],
  ]);
  assert.deepEqual(TEST_SUBSCRIPTION_PLANS.map(x => x.amountKobo),
    [200_000, 500_000, 1_800_000]);
});

test('three tiers upgrade capabilities without restricting core cashier operations', () => {
  const free = SUBSCRIPTION_ENTITLEMENTS.free;
  const monthly = SUBSCRIPTION_ENTITLEMENTS.monthly;
  const quarterly = SUBSCRIPTION_ENTITLEMENTS.quarterly;
  const annual = SUBSCRIPTION_ENTITLEMENTS.annual;
  assert.equal(free.maxBranches, 1);
  assert.equal(free.maxStaff, 1);
  assert.equal(free.features.customers, false);
  assert.equal(monthly.maxStaff, 3);
  assert.equal(monthly.features.customers, true);
  assert.equal(monthly.features.reports, false);
  assert.equal(quarterly.maxBranches, 3);
  assert.equal(quarterly.features.reports, true);
  assert.equal(quarterly.features.grossProfit, false);
  assert.equal(annual.maxBranches, 10);
  assert.equal(annual.maxStaff, 50);
  assert.equal(Object.values(annual.features).every(Boolean), true);
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
