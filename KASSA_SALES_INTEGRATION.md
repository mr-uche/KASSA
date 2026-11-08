# Kassa Sales & Transactions — Phase 3 integration

## Implemented
- `POST /api/v1/sales` (JWT required, Owner only) creates an actual sale in Supabase with `PENDING_PAYMENT` status and a pending `Payment` record. It computes line and sale totals from the current database product prices **on the backend**.
- `GET /api/v1/sales?businessId=<uuid>&branchId=<uuid>` (JWT and membership check) returns the latest 100 sale records for that branch.
- `GET /api/v1/sales/:saleId` returns a real sale with line items and payment details for authorized members.
- `POST /api/v1/sales/:saleId/confirm-cash` (Owner only, body `{"cashReceived":true}`) should be used **only after physical cash has actually been received**. It atomically marks the sale paid, marks its cash payment successful, decreases the branch's stock, and creates `StockMovement` records. A repeated confirmation does not deduct stock again.
- Requests use a client-generated `clientRequestId` (UUID v4) embedded in the sale reference as an idempotency key. Reuse the same ID when retrying a request.
- The Next.js `/api/sales` route is authenticated through the HttpOnly session cookie and forwards to NestJS. The frontend has no direct Supabase credentials.

## Frontend screens
- New Sale: choose real inventory products; no sample cart items.
- Checkout: review the order, then save it as **pending**. Backend recalculates the authoritative amount.
- Payment: reads actual sale status; only cash provides the explicit physical-receipt confirmation button.
- Success screen: shows payment success only when the backend returns `PAID` and a successful payment.
- Receipt: reads actual paid sale and line items; only available after successful payment.
- Transactions, transaction detail, and dashboard recent transactions: show real sale records and amounts. The Transactions page supports search, status, channel and date filters, plus CSV export.

## IMPORTANT safety and product limits
- **Electronic payments are NOT processed or verified.** Card, POS, USSD, bank transfer, and wallet records stay `PENDING_PAYMENT`. Never manually mark them successful. Production requires a trusted payment gateway, signed webhooks, verified provider references, reconciliation, idempotency, and a refund workflow.
- Creating a pending sale **does not reserve stock**. When cash is confirmed, the backend atomically checks remaining quantity and rejects confirmation if there is insufficient stock.
- Cash confirmation is a merchant attestation, not a gateway verification. At this stage only the business **Owner** can create or confirm sales.
- Customers default to Walk-in customer until the Customers backend is integrated.
- A pending sale is **not** counted as received funds. Dashboard 'Total sales today' counts paid sales.
- Lists currently return the latest **100** sales per branch, not all-time aggregate history.
- `schema.prisma` already defines Sale, SaleItem, Payment, and StockMovement; **no new migration** is required for this change.
- The scanner, disputes, automatic electronic-payment settlements, receipts sent via SMS/email, refunds, and comprehensive reports remain separate future work.

## Local check (run before considering complete)
1. Save any uncommitted local changes, then `git pull origin main`.
2. Terminal 1: `cd backend`, `npm run db:generate`, `npm run typecheck`, `npm run start:dev`.
3. Terminal 2 (project root): `npx tsc --noEmit`, `npm run dev`.
4. Log in as business Owner. Ensure there is at least one product with sufficient stock in the selected branch.
5. In New Sale, select a product and **Cash**, then review checkout and save the pending sale.
6. Go to Transactions and confirm the new sale appears with **Pending** status; check stock is unchanged.
7. Open the payment status page, physically simulate receiving the correct cash in a test-only scenario, tick the acknowledgment and click **Confirm cash received**.
8. Verify the sale changes to **Success**, a real receipt becomes available, and product stock decreases by the purchased quantity.
9. Reopen the already-paid sale: refreshing or repeating the confirmation must **not** decrement stock twice.
10. Start a new sale with **Transfer** or **Card** and verify it remains **Pending** and **does not** generate a paid receipt or decrease stock.
11. Test insufficient-stock behavior: if another confirmed sale consumes the stock, confirming an older pending cash sale must return a conflict and not change the stock or payment status.

## Backend Swagger sample
Once authorized in `http://localhost:3001/api/docs`, submit `POST /api/v1/sales`:

```json
{
  "businessId": "replace-with-business-uuid",
  "branchId": "replace-with-branch-uuid",
  "clientRequestId": "replace-with-new-v4-uuid",
  "channel": "CASH",
  "items": [
    {"productId": "replace-with-product-uuid", "quantity": 2}
  ]
}
```

Do not paste real JWTs, database passwords, or payment secrets into a public issue or chat. Only use test merchant data during development.
