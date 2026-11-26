# KASSA Subscription & Billing — release/configuration guide

This module bills **KASSA business owners for the KASSA SaaS service**.
It does **not** handle merchant customer checkout, POS settlement, or business receiving accounts.

## Release gate

Payment initialization requires configured Paystack credentials and the approved server catalog. Do **not** announce billing as live or collect real
money until deployment, migrations, webhook setup and end-to-end tests are complete.

1. Back up the production PostgreSQL database. Inspect the additive migration
   `20261120110000_subscription_billing`; it only adds `SubscriptionCharge`
   and indexes. Deploy it **before** the new backend:
   `cd backend && npx prisma migrate deploy`.
2. The approved catalog is defined in `backend/src/subscription/subscription-access.ts`.
   The twelve plan codes and prices are server-authoritative. Remove the old
   `KASSA_BILLING_PLANS_JSON` setting from deployment configuration; it is no
   longer read, so stale pilot pricing cannot override the approved prices.
3. Set `PAYSTACK_SECRET_KEY=sk_test_...` to start in test mode.
   Set `FRONTEND_URL` to the public HTTPS KASSA Web origin.
4. Configure the signed webhook URL in Paystack:
   `https://YOUR_BACKEND_HOST/api/v1/payments/paystack/webhook`.
   Prefer modern `PAYSTACK_WEBHOOK_SECRET=whsec_...` signatures. Legacy
   test-mode webhook signatures also work with the test key.
5. Verify KASSA Web **and** Android settings with an owner account:
   GET billing status; start a Paystack test checkout; return to the page; press
   **Verify payment**; confirm new ACTIVE status, expected expiry and history.
   Repeat verification and webhook delivery, checking the expiry is extended
   **only once** for the same reference.
6. Attempt every endpoint with a staff token: it must return 403, including
   `POST /billing/initialize` and `POST /billing/verify`.
   Confirm a forged or unrelated reference, incorrect amount, incorrect currency,
   wrong environment or unsigned webhook never activates an account.
7. Confirm merchant sale/checkout still credits **the merchant**, not KASSA.
   Check old inventory and sales flows and migrate-back/rollback procedures.

## Live payments

Live charges are **disabled by default**. To explicitly permit them after
approval and verification, configure a live Paystack key (`sk_live_...`),
`PAYSTACK_WEBHOOK_SECRET=whsec_...`, and
`KASSA_BILLING_LIVE_ENABLED=true`. Never place secret keys in Expo
`EXPO_PUBLIC_*` variables or the Next.js browser bundle.

## Behaviour and limits

- Only the business owner can view, initialize or verify SaaS payments.
- Charges are recorded independently of store sales and receipts.
- The server decides price, currency and duration; the client submits only a plan code.
- A verified Paystack success **with matching reference, environment, NGN amount
  and transaction ID** records the payment and extends the business period.
- In-progress charges block duplicate checkout sessions. A user can resume a
  previously issued Paystack checkout URL or retry verification.
- Test transactions may mark a subscription ACTIVE in a test environment, but
  **no money was received**. Do not treat test status as a paid commercial account.
- Billing renewals require **an explicit new payment**. There is no recurring
  automatic debit, invoice PDF generator, refund processing, plan-switching
  proration or subscription-based feature restriction in this release.
- With feature restrictions disabled (default), no existing staff/business
  access is disabled on expiration. If restrictions are enabled, premium features
  and new branch/staff additions follow the fallback tier after expiry.
- A provider connection timeout may leave an unverified pending charge:
  reconcile with Paystack before trying a new charge. Do not delete or clear
  pending financial records blindly.

## Key endpoints

- `GET /api/v1/billing/status?businessId=UUID` — status, plan options, payment history.
- `POST /api/v1/billing/initialize` — `{ "businessId": "UUID", "planCode": "..." }`.
- `POST /api/v1/billing/verify` — `{ "businessId": "UUID", "reference": "KSB-..." }`.

All endpoints require an authenticated **business owner**. Existing signed
Paystack webhook `/api/v1/payments/paystack/webhook` also verifies `KSB-`
subscription references, without touching merchant sale payments.

## Approved subscription catalog (NGN)

| Tier | Branches | Staff (owner excluded) | Monthly | Quarterly | Annual |
| --- | ---: | ---: | ---: | ---: | ---: |
| Starter | 1 | 3 | 2,000 | 5,400 | 19,200 |
| Growth | 2 | 10 | 5,000 | 13,500 | 48,000 |
| Business | 5 | 25 | 10,000 | 27,000 | 96,000 |
| Enterprise | 10 | 50 | 18,000 | 48,600 | 172,800 |

Monthly/quarterly/annual terms remain 30/90/365 days. Quarterly saves 10%;
annual saves 20% against the monthly price multiplied by 3 or 12.
Plan codes use `starter_monthly`, `growth_quarterly`, etc.
Every new paid tier includes all four premium features, subject to role permissions.
Staff invitations reserve capacity; owners do not count for the new paid tiers.
Free and legacy monthly/quarterly/annual purchases keep their prior limits and
feature access through their purchased expiry. No historical charge amounts change.
New purchases start at the end of any existing paid period; there is no proration.
Feature gates remain opt-in with `KASSA_SUBSCRIPTION_FEATURE_GATES_ENABLED=true`.
Audit existing businesses before enabling; existing records are never deleted.
Live payments remain subject to the existing gateway and live opt-in safeguards.

## Login/sign-up visual polishing

The mobile business sign-up now uses the same 70 × 70 px mark and 30 pt KASSA
wordmark size as the mobile login. Both sign-up password fields have separate
eye-visibility controls placed in the fields (the old external toggle is gone).
