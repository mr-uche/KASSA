const test = require('node:test');
const assert = require('node:assert/strict');
const { ExpensesService } = require('../src/expenses/expenses.service');

const scope = {
  businessId: '11111111-1111-4111-8111-111111111111',
  branchId: '22222222-2222-4222-8222-222222222222',
  amount: '1250.00',
  category: 'Utilities',
  description: 'Shop electricity',
  spentAt: '2026-11-20',
};

function fixture(role = 'Owner') {
  const calls = { created: null, updated: null, listWhere: null, listSelect: null };
  const prisma = {
    businessMembership: {
      findUnique: async () => role === 'Outside'
        ? null : { role: { name: role } },
    },
    branch: {
      findFirst: async ({ where }) => where.businessId === scope.businessId &&
        where.id === scope.branchId ? { id: scope.branchId } : null,
    },
    expense: {
      create: async ({ data }) => { calls.created = data; return { id: 'expense-id' }; },
      findFirst: async () => ({
        id: 'expense-id', businessId: scope.businessId, receiptData: null,
        receiptName: null, receiptMime: null,
      }),
      update: async ({ data }) => { calls.updated = data; return { id: 'expense-id' }; },
      findMany: async ({ where, select }) => {
        calls.listWhere = where;
        calls.listSelect = select;
        return [];
      },
      aggregate: async () => ({ _sum: { amount: null }, _count: 0 }),
      groupBy: async () => [],
    },
  };
  return { service: new ExpensesService(prisma), calls };
}

test('only owners can read and create business expenses', async () => {
  for (const role of ['Cashier', 'Manager', 'Outside']) {
    const { service } = fixture(role);
    await assert.rejects(service.list('user-id', scope.businessId), /Only business owners/);
    await assert.rejects(service.create('user-id', scope), /Only business owners/);
  }
});

test('expenses cannot be recorded in a branch outside the business', async () => {
  const { service } = fixture();
  await assert.rejects(
    service.create('user-id', { ...scope, branchId: '33333333-3333-4333-8333-333333333333' }),
    /Active branch not found/,
  );
});

test('valid expenses save a precise money string, category and date without changing stock', async () => {
  const { service, calls } = fixture();
  const created = await service.create('user-id', scope);
  assert.equal(created.id, 'expense-id');
  assert.equal(calls.created.amount, '1250.00');
  assert.equal(calls.created.category, 'Utilities');
  assert.equal(calls.created.description, 'Shop electricity');
  assert.equal(calls.created.spentAt.toISOString(), '2026-11-20T00:00:00.000Z');
  assert.deepEqual(Object.keys(calls.created).sort(), [
    'amount', 'branchId', 'businessId', 'category', 'createdById', 'description', 'spentAt',
  ].sort());
});

test('rejects malformed dates, empty descriptions and zero expenses', async () => {
  const { service } = fixture();
  await assert.rejects(service.create('user-id', { ...scope, amount: '0.00' }), /greater than zero/);
  await assert.rejects(service.create('user-id', { ...scope, description: '   ' }), /description is required/);
  await assert.rejects(service.create('user-id', { ...scope, spentAt: '2026-02-31' }), /valid expense date/);
});

test('expense list never selects private receipt bytes', async () => {
  const { service, calls } = fixture();
  const list = await service.list('user-id', scope.businessId, scope.branchId);
  assert.equal(list.summary.count, 0);
  assert.equal(calls.listWhere.businessId, scope.businessId);
  assert.equal(calls.listWhere.branchId, scope.branchId);
  assert.equal(Object.prototype.hasOwnProperty.call(calls.listSelect, 'receiptData'), false);
});

test('receipt validation checks signature, size and owner permission', async () => {
  const { service, calls } = fixture();
  const png = Buffer.from([137,80,78,71,13,10,26,10,0,1]);
  await service.attachReceipt('user-id', scope.businessId, 'expense-id', {
    originalname: 'shop slip.png', mimetype: 'image/png', size: png.length, buffer: png,
  });
  assert.equal(calls.updated.receiptMime, 'image/png');
  assert.deepEqual(Buffer.from(calls.updated.receiptData), png);
  await assert.rejects(service.attachReceipt('user-id', scope.businessId, 'expense-id', {
    originalname: 'fake.png', mimetype: 'image/png', size: 4, buffer: Buffer.from('evil'),
  }), /PDF, PNG, JPEG or WebP/);
  await assert.rejects(service.attachReceipt('user-id', scope.businessId, 'expense-id', {
    originalname: 'large.pdf', mimetype: 'application/pdf', size: 2 * 1024 * 1024 + 1,
    buffer: Buffer.from('%PDF-example'),
  }), /up to 2 MB/);
});
