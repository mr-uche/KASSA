# Kassa × Paystack: TEST-mode payment collection

This code integrates **only Paystack TEST mode** with the existing NestJS + Prisma + Supabase + Next.js application. No actual money is collected. Kassa explicitly rejects live keys (`sk_live_`). It does not enable Kassa merchant payouts, revenue splits, terminal/POS devices, wallet balance, refunds, subscription billing, or settlement to merchant bank accounts.

## 1. Setup in Paystack and Render

1. Log in to your [Paystack Dashboard](https://dashboard.paystack.com/) in **Test mode**.
2. Obtain the **Test Secret Key** (starts `sk_test_`) from Developers → API Keys / API Configuration.
3. In the [Kassa Render service](https://dashboard.render.com/web/srv-dbp33ed6e07s73bru05g) choose **Environment** and add:
   - `PAYSTACK_SECRET_KEY` = your `sk_test_...` secret, only in Render
   - `FRONTEND_URL` = `https://kassa-bay.vercel.app` (already configured)
   - `PAYSTACK_WEBHOOK_SECRET` = your `whsec_...` signing secret, **if the Paystack dashboard supplies one for test mode** (recommended). Do not generate an arbitrary secret; use the secret Paystack gives you.
4. Redeploy/restart Render after changes.
5. On the Paystack Dashboard in **Test mode**, configure the webhook URL:

   ```text
   https://kassa-api-18he.onrender.com/api/v1/payments/paystack/webhook
   ```

   For newer `Paystack-Signature` events, Kassa verifies `whsec_`, timestamp (±300 seconds), and HMAC-SHA512 over `timestamp + "." + raw_body`.
   For older `x-paystack-signature` events, Kassa verifies HMAC-SHA512 over the raw body using the `sk_test_` secret.
   If a modern signature is present, Kassa does **not** downgrade to legacy verification. The body is captured before JSON parsing with NestJS `rawBody: true`.

**Never put the test secret key in Next.js, Vercel, `.env.local` in the frontend, GitHub, screenshots, or chat.** The existing Vercel configuration `KASSA_API_URL=https://kassa-api-18he.onrender.com` stays unchanged.

## 2. Run a safe test checkout

1. In the deployed Kassa web app, use only sample products/business data for these exercises.
2. Open **New Sale**, add an in-stock sample product, select **Card**, **Bank Transfer**, or **USSD**, then create a pending sale.
3. On **Payment Status**, enter a test payer email and select **Open Paystack test checkout**.
4. Complete Paystack's **test** flow with test instruments from Paystack documentation—not real bank transfers or live cards.
5. Paystack returns to Kassa's `/sales/payment?saleId=<uuid>` callback. Kassa independently fetches `GET /transaction/verify/:reference` from NestJS. The callback query is never proof of payment.
6. A signed `charge.success` webhook can also trigger independent verification. Duplicate callbacks/webhooks are handled idempotently.
7. Only after status = success, exact saved reference, exact amount (kobo), currency = NGN, and Paystack domain = test match do we mark `PAID`, record inventory movements, and allow the receipt.
8. **All Paystack test receipts are watermarked prominently**. These are simulation records, not receipts for real money.

For cash, existing physical confirmation flow remains unchanged. Physical POS and wallet methods remain pending without a Paystack hosted checkout.

## 3. Reconciliation and exceptions

- The business **Owner** can open **Settings → Payments & Reconciliation** and reconcile up to five pending Paystack test payments in the selected branch.
- Reconciliation calls Paystack's independent verification endpoint for each pending reference. It can recover from a missed callback/webhook.
- Payment confirmation and stock deduction use a single PostgreSQL transaction and a conditional sale status update so retries don't deduct stock twice.
- If Paystack confirms test payment but the branch doesn't have enough stock, Kassa records the verified gateway payment and marks it **needs review** while leaving the sale pending—**no paid receipt**. The owner should review the stock discrepancy and rerun reconciliation once resolved.
- A network interruption during initialization can leave the payment reference reserved. Do not start another checkout for the same sale until its Paystack status has been reconciled. This avoids duplicate charges.
- Each verified transaction has a minimal, non-PII `PaymentEvent` audit record, not complete webhook/card/customer payloads.
- A payment verified as success cannot create duplicate sale inventory movements. Refund and chargeback handling still require a separate design.

**Manual reconciliation only:** This initial release does not schedule background jobs or reconcile Paystack merchant settlements/bank payouts. Production deployment requires an appropriate job queue, retries, exception workflow, settlement-ledger reconciliation, tenant-specific Paystack accounts/subaccounts, and monitoring.

## 4. API reference

Authenticated NestJS endpoints (session cookies are exchanged for Bearer tokens by the Next.js proxy):
- `POST /api/v1/payments/paystack/initialize` — `{ "saleId": "<uuid>", "email": "customer@example.com" }`
- `POST /api/v1/payments/paystack/verify` — `{ "saleId": "<uuid>" }`
- `POST /api/v1/payments/paystack/reconcile` — owner only: `{ "businessId": "<uuid>", "branchId": "<uuid>", "limit": 5 }`
- `POST /api/v1/payments/paystack/webhook` — public URL, but requires valid Paystack raw-body signature.

Next.js same-origin authenticated proxies:
- `/api/payments/paystack/initialize`
- `/api/payments/paystack/verify`
- `/api/payments/paystack/reconcile`

**No database schema migration is required:** uses existing `Payment.provider`, `Payment.providerReference`, `PaymentEvent`, `Payment.status`, `Sale.status` and `StockMovement`.

## 5. Automated signature tests

From `backend/` with Node installed:

```bash
npm install
npm run test:paystack
npm run build
```

The backend's build script runs the signature tests before NestJS compiles. Tests cover both signature formats, tampering, missing signatures, replay protection and failure to downgrade to legacy after an invalid modern signature.

## 6. Official Paystack references

- [Accept Payments](https://paystack.com/docs/payments/accept-payments/)
- [Transaction API: initialize & verify](https://paystack.com/docs/api/transaction/)
- [Webhooks and signed requests](https://paystack.com/docs/payments/webhooks/)
- [Verify Payments](https://paystack.com/docs/payments/verify-payments/)
- [Test Payments](https://paystack.com/docs/payments/test-payments/)

## 7. Financial reporting separation

Paystack TEST transactions are still recorded and labelled in transaction history and test receipts, but do **not** contribute to:
- Dashboard "Total sales today"
- Transactions "Total received" and "Successful" summary cards
- Backend Reports & Analytics revenue, sales charts, channel totals, top products and branch/staff earnings.

Test transactions may still affect **test inventory quantities** during a verified simulated checkout. Do not use live merchant inventory for test scenarios.
