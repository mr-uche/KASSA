# Kassa inventory API and screen integration

This phase reuses the existing `Category`, `Product`, `StockBalance`, and `StockMovement` Prisma models. It does **not** alter `schema.prisma` and requires no new migration. Run `npm run db:generate` in `backend` if you have not generated the Prisma client locally.

## Routes

Authenticated NestJS routes use prefix `/api/v1`:

| Method | Path | Body/query | Notes |
| --- | --- | --- | --- |
| GET | /inventory/categories | businessId, branchId (query) | Includes count and cost-valued branch stock |
| POST | /inventory/categories | businessId, name, description?, isActive? | Owner only |
| GET | /inventory/products | businessId, branchId (query) | All products, with scoped branch quantities and low-stock statuses |
| POST | /inventory/products | businessId, branchId, name, sku, categoryId, sellingPrice, costPrice?, currentStock, lowStockThreshold, brand?, unit?, description? | Owner only; initial stock logged |
| POST | /inventory/products/:productId/restock | businessId, branchId, quantity, supplierRef?, note? | Owner only; atomic stock increase + movement |

All operations require a valid bearer JWT. User membership is checked against the business; non-owner members may view stock in their assigned branch but cannot currently mutate inventory. There is no direct client-side Supabase connection.

## Frontend

Existing screens preserve their layout:

- `/products`: live catalogue, categories, stock statuses, filters, and counts.
- `/products/categories/add`: save a category in the current business.
- `/products/add`: create a product in the current branch, including opening stock quantity.
- `/products/restock`: choose a real product, then increase its branch stock.

Next.js API requests are proxied through the existing authenticated HttpOnly session cookie. The selected branch is resolved from the accessible branches returned by `/businesses/mine` and the dashboard's `selectedBranch` local preference. **The backend always re-checks business ownership and branch permission**.

## Test locally

1. From the repository root: `git pull origin main`.
2. Terminal 1: `cd backend && npm run db:generate && npm run start:dev`.
3. Terminal 2 (root): `npm run dev`.
4. Sign in to a completed merchant account. Open `/products` and confirm the catalogue starts empty if you haven't created inventory.
5. Add a category; return to Products > Categories and confirm it is present.
6. Add a product using that category, a unique SKU, selling price and opening stock.
7. Confirm the product appears in the catalogue and low-stock indicators match the threshold.
8. Restock that product. Confirm the quantity increases and low-stock status updates.
9. In Swagger at `http://localhost:3001/api/docs`, verify the Inventory endpoints.

For standalone checks: run `npm run typecheck` in `backend` and `npx tsc --noEmit` in the root frontend.

**Known limitations**: product image upload is not connected yet; sales are still demo-only; category editing and product editing/deletion are not implemented; multi-business selection UI is not yet implemented; other dashboard finance widgets still use sample data. Stock values use **cost price** (products without a cost price contribute zero) and quantities are branch-scoped. Customer-facing payment and settlement flows are not implemented.

Your locally created migration history for authentication/onboarding must be committed separately if it is not already on GitHub. Do not commit `backend/.env` or any database password.
