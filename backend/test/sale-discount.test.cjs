const test = require('node:test');
const assert = require('node:assert/strict');
const { saleDiscountKobo } = require('../src/sales/sale-discount');
test('undiscounted and discounted sales use exact integer kobo', () => {
  assert.equal(saleDiscountKobo(1500000n), 0n);
  assert.equal(saleDiscountKobo(1500000n, '1500.00'), 150000n);
  assert.equal(saleDiscountKobo(101n, '1.00'), 100n);
});
test('rejects negative, malformed, full and excessive discounts', () => {
  for (const value of ['-1', '1.001', '1e2', 'abc', '100.00', '100.01', '', null])
    assert.throws(() => saleDiscountKobo(10000n, value));
});
