# KASSA Subscription & Billing — release/configuration guide

This module bills **KASSA business owners for the KASSA SaaS service**.
It does **not** handle merchant customer checkout, POS settlement, or business receiving accounts.

## Release gate

The code is deliberately disabled until the platform operator sets an approved plan
catalog and Paystack credentials. Do **not** announce billing as live or collect real
money until deployment, migrations, webhook setup and end-to-end tests are complete.

1. Back up the production PostgreSQL database. Inspect the additive migration
   `20261120110000_subscription_billing`; it only adds `SubscriptionCharge`
   and indexes. Deploy it **before** the new backend:
   `cd backend && npx prisma migrate deploy`.
2. On the backend only, set `KASSA_BILLING_PLANS_JSON` to a valid JSON array.
   Each plan contains:
   - `code`: unique lower-case letters, digits, `_` or `-` (2–48 characters)
   - `name`: the approved plan name (1–80 characters)
   - `amountKobo`: the approved amount in **kobo**, integer from 100 to 2,000,000,000
   - `durationDays`: the approved subscription duration in days (1–366)

   Example *shape* (replace all placeholders with approved real values):
   `[{"code":"your-plan","name":"Your Plan","amountKobo":12345,"durationDays":30}]`
   **The numeric example is illustrative, not an approved KASSA price or plan.**
3. Set `PAYSTACK_SECRET_KEY=sk_test_...` to start in test mode. When no custom
   catalog is set, the built-in three TEST plans appear automatically.
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

## Three pilot subscription plans (TEST PRICES, not approved)

| Tier | Test price | Period | Max branches | Staff incl. owner | Customers | Reports | Gross profit | Exports |
| --- | ---: | --- | ---: | ---: | --- | --- | --- | --- |
| No active plan | ₦0 | — | 1 | 1 | Locked | Locked | Locked | Locked |
| Monthly | ₦2,000 | 30 days | 1 | 3 | Yes | No | No | No |
| Quarterly | ₦5,000 | 90 days | 3 | 15 | Yes | Yes | No | No |
| Annual | ₦18,000 | 365 days | 10 | 50 | Yes | Yes | Yes | Yes |

Core cashier sale capture, transaction history subject to staff-role
permissions, product/inventory functions, and the owner's ability to subscribe
are *not* disabled by these subscription tiers. The staff-role permission
system remains a second, independent authorization layer.

The backend enforces these four premium features and the branch/invitation
capacity limits when
`KASSA_SUBSCRIPTION_FEATURE_GATES_ENABLED=true`. An expired or missing
subscription falls back to the no-active-plan tier.
**Do not enable the switch in production without auditing existing businesses:
new invites, branches and premium endpoints may become unavailable.**
Existing data is never deleted, the checkout and offline queues remain intact,
and users retain billing/settings access.

A missing `KASSA_BILLING_PLANS_JSON` shows exactly the three TEST prices in
the billing UI and allows **test-mode** checkout when `sk_test_...` is configured.
The fallback never authorizes a live-money charge. Live subscriptions require
explicit operator-approved prices, a live key, webhook secret, and opt-in.

## Login/sign-up visual polishing

The mobile business sign-up now uses the same 70 × 70 px mark and 30 pt KASSA
wordmark size as the mobile login. Both sign-up password fields have separate
eye-visibility controls placed in the fields (the old external toggle is gone).
