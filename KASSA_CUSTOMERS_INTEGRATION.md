# Kassa Customers Management

This phase reuses the existing Prisma `Customer` and `Sale.customerId` models. **No migration is required.**

## Backend API

All routes use prefix `/api/v1`, require a valid JWT, and are currently restricted to the business **Owner** because customer contact details are sensitive. Staff role permissions will be implemented later.

| Method | Route | Parameters |
| --- | --- | --- |
| GET | `/customers?businessId=<uuid>` | Returns up to 500 newest records, each with paid-purchase count and last paid-purchase time |
| POST | `/customers` | `{ businessId, fullName, phone, email?, address?, notes? }` |
| GET | `/customers/:customerId?businessId=<uuid>` | Gets a customer belonging to the specified business |
| PATCH | `/customers/:customerId` | `{ businessId, fullName?, phone?, email?, address?, notes? }` |

The backend checks business ownership **on every request**, and customer updates are constrained to records belonging to the supplied business. It trims names and phone numbers and validates contact fields. Optional fields can be cleared via `null`.

A new optional `customerId` field is supported on `POST /api/v1/sales`. The server validates that the selected customer belongs to the same business. Saved sales retain the customer reference. Purchase counts include **only sales with `PAID` status**.

## Frontend

- `/customers` displays real customer records, business-wide customer counts, paid purchases, search, working filters/sorting, CSV export, and edit links.
- `/customers/add` creates a new customer in the current merchant's business.
- `/customers/:id/edit` loads an existing customer and allows editing their information.
- `/sales/new` lets the merchant pick a saved customer or a walk-in customer.
- The checkout page passes the selected customer ID to the backend; transaction and receipt views receive the saved customer's name.
- The original page layouts remain similar, but sample customer rows and invented counters have been removed.

## Limitations

- Customers belong to a **business**, not an individual branch. Branch-based customer filtering is therefore not offered yet.
- VIP, wholesale, corporate, active/inactive tags and segmentation are **not** stored by the existing database schema. The previous nonfunctional customer-type dropdown was replaced by a read-only business-wide scope indicator. The list uses `Returning` / `New` strictly to mean whether there are **linked confirmed purchases**, not an independently stored status.
- Customer purchase history is updated **only when a new sale is explicitly assigned to that customer and becomes PAID**. Earlier walk-in sales cannot be automatically attributed to a customer.
- Only the 500 newest customers are currently returned; pagination and server-side search are future enhancements. Summary cards reflect those retrieved customer records.
- Existing email/SMS marketing, loyalty points, duplicate contact resolution, and bulk deletion are not implemented.
- CSV export contains customer contact details. Handle exports as private personal data.

## Test locally

1. Save uncommitted local work. From the repo root, run `git status` and `git pull origin main`.
2. In backend terminal: `cd backend`, `npm run db:generate`, `npm run typecheck`, and `npm run start:dev`.
3. In frontend terminal: `npx tsc --noEmit`, then `npm run dev`.
4. Sign in with a completed business **Owner** account. Navigate to `/customers`. Check that empty businesses have no fabricated customer records.
5. Open Add Customer and save a test name and phone. Confirm the new record appears on the Customers page and its email/notes can be edited.
6. Test search, With purchases/No purchases filters, sorting, and CSV export.
7. Open `/sales/new`, select an in-stock product, and choose the new test customer instead of Walk-in. Create a **Cash** sale. The customer purchase count must still be 0 while the sale is pending.
8. Only in a controlled test where the cash is marked received, explicitly confirm cash receipt. Return to Customers: the chosen customer's purchase count should increase and Last Purchase update.
9. Create a test **Transfer** sale for a customer; it must remain pending, **not** increase the paid-purchase counter, and **not** issue a verified receipt.
10. Attempt to fetch another business's customers without membership; the backend should reject it.

The code was pushed to GitHub but **has not been built or browser-tested in this environment**.
