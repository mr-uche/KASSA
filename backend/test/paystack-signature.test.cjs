const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { verifyPaystackSignature } = require('../src/paystack/paystack.signature.ts');

const body = Buffer.from(JSON.stringify({
  event: 'charge.success', data: { reference: 'PAY-12345678-1234-1234-1234-123456789abc' },
}), 'utf8');
const oldKey = 'sk_test_unit_test_value_only_not_a_real_secret';
const newKey = 'whsec_unit_test_value_only_not_a_real_secret';
const timestamp = 1794294000;
const message = Buffer.concat([Buffer.from(String(timestamp) + '.'), body]);
const signature = createHmac('sha512', newKey).update(message).digest('hex');
const modern = 't=' + timestamp + ',v1=whk_other:invalid,v1=whk_sample1:' + signature;

test('accepts modern signed raw body with timestamp and multiple v1 signatures', () => {
  assert.equal(verifyPaystackSignature(body, modern, undefined, newKey, oldKey, timestamp), true);
  assert.equal(verifyPaystackSignature(body, modern.replace(',v1=', ', v1='), undefined, newKey, oldKey, timestamp), true);
});

test('rejects old and future signatures outside 300 second window', () => {
  assert.equal(verifyPaystackSignature(body, modern, undefined, newKey, oldKey, timestamp + 301), false);
  assert.equal(verifyPaystackSignature(body, modern, undefined, newKey, oldKey, timestamp - 301), false);
});

test('rejects altered payload and incorrect webhook signing secret', () => {
  assert.equal(verifyPaystackSignature(Buffer.from('altered'), modern, undefined, newKey, oldKey, timestamp), false);
  assert.equal(verifyPaystackSignature(body, modern, undefined, 'whsec_other', oldKey, timestamp), false);
});

test('does not fall back to legacy header when a modern header is present but invalid', () => {
  const legacy = createHmac('sha512', oldKey).update(body).digest('hex');
  assert.equal(verifyPaystackSignature(body, 't=broken,v1=whk_id:bad', legacy, newKey, oldKey, timestamp), false);
});

test('accepts valid legacy x-paystack-signature against exact raw body', () => {
  const legacy = createHmac('sha512', oldKey).update(body).digest('hex');
  assert.equal(verifyPaystackSignature(body, undefined, legacy, undefined, oldKey, timestamp), true);
  assert.equal(verifyPaystackSignature(Buffer.from('altered'), undefined, legacy, undefined, oldKey, timestamp), false);
  assert.equal(verifyPaystackSignature(body, undefined, legacy, undefined, 'sk_live_forbidden', timestamp), false);
});

test('rejects missing, malformed and cross-mode signatures', () => {
  assert.equal(verifyPaystackSignature(body, undefined, undefined, newKey, oldKey, timestamp), false);
  assert.equal(verifyPaystackSignature(body, undefined, 'zz', newKey, oldKey, timestamp), false);
  assert.equal(verifyPaystackSignature(body, modern, undefined, undefined, oldKey, timestamp), false);
});
