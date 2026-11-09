# Kassa role-based screen access — November 9, 2026

## Implemented route coverage

| Screen group | Required permission | Route prefix |
|---|---|---|
| Dashboard | View dashboard | /dashboard |
| Sales / checkout / receipt | Manage sales & transactions | /sales |
| Transactions and detail pages | Manage sales & transactions | /transactions |
| Barcode scan / code entry | Manage sales & transactions | /scan |
| Products, categories and restocking | Manage products & inventory | /products |
| Customers, add and edit | Manage customers | /customers |
| Reports & Analytics | View reports & analytics | /reports |
| Staff, branches, invitations, roles | Owner | /staff-branches |
| Business Settings | Owner | /settings |

Nested Next.js layouts guard each route group before rendering its page. Other than Reports (which already had a frontend-specific guard), the new client guard displays Access restricted and preserves mobile sidebar navigation. The sidebar only shows accessible links.

Role permission information is returned by GET /api/businesses/mine for the authenticated user's own membership; it is never accepted from the browser as proof of authorization. The NestJS business access policy remains authoritative for Reports, Sales, Inventory, Customers and Staff Management API operations.

## Checkout-specific least privilege

Cashiers with Manage sales & transactions can call GET /sales/catalog using their authorised businessId/branchId. This listing includes selling prices, product names, SKUs, categories and available branch stock, but deliberately excludes cost price. Only users with Manage customers permission can fetch the customer list during checkout; others can sell to a Walk-in customer. Cash payments still need confirmation.

## Landing-page behavior

After login, invitation registration/acceptance, or remember-me restoration, users are directed to an appropriate allowed route. A sales-only user lands on /sales/new instead of an inaccessible /dashboard. The sidebar includes New Sale and Scan Product for sales-authorized staff.

## Manual QA matrix

1. Log in as Owner and verify all navigable screens are visible, including Staff & Branches and Settings.
2. Create a Cashier role with only Manage sales & transactions. Invite a new staff member to an active branch. Sign in, verify that New Sale, Transactions and Scan Product are accessible; Dashboard/Products/Customers/Reports/Settings/Staff must show Access restricted on direct URLs.
3. As Cashier, create a walk-in sale using an existing product. Checkout must not require Manage products & inventory or Manage customers. Verify that cost price does not appear in GET /api/sales/catalog.
4. Create an Inventory Manager role with only Manage products & inventory. Products should work; /sales/new, /transactions, /customers and /reports should be restricted.
5. Create an Analyst role with only View reports & analytics. Reports should show data for their assigned active branch, not other branches. Confirm direct GET /api/reports/summary with an unauthorized business/branch rejects access.
6. Create a Customer Manager role with Manage customers. Customers/add/edit should work; other protected paths should reject access.
7. Create a Dashboard Viewer role with only View dashboard. Dashboard should open, but detailed transaction data and sale actions should say Restricted; unauthorised API calls must be rejected.
8. As Owner, change a role permission. In the staff browser, refocus/reload. Newly authorised links should appear and unauthorized screens should be hidden. Check a direct URL and API call return appropriate restrictions.
9. Check nested routes: /products/add, /products/restock, /customers/add, /transactions/[id], /sales/checkout, /staff-branches/roles/add, /scan/product-code.
10. Check mobile: opening an unauthorized URL should still offer a working navigation menu and an Access restricted message.

## Known limitations

- These client-side guards improve UX but do not by themselves make a private server endpoint safe. Backend policies remain necessary. For screens without implemented data APIs (e.g. Settings), the UI is owner-only while the underlying settings features are still incomplete/demo.
- Dashboard View dashboard permission is distinct from Manage sales & transactions. A dashboard-only role cannot fetch full transaction details, so those widgets show Restricted instead of inventing zero sales.
- Profile settings for staff, dashboard-level read-only reporting, per-action read versus write permissions, cross-business tenant switching, and suspension/audit actions need follow-up development.
- Checkout product listing is purposely limited; access to full stock valuation still requires Manage products & inventory.
- Email delivery for staff invitation is not yet connected. Share one-time links securely.
- No extra migration was added for the screen guards, but the earlier staff migration 20261109112500_staff_branches must be applied if your database is missing Branch.code.
- Code has been committed to GitHub main; local Node/Prisma builds and browser end-to-end tests must still be run on the user's PC.

## Pull and test on Windows

From C:\dev\KASSA: git pull origin main, then npx next typegen, npx tsc --noEmit, npm run dev.
From C:\dev\KASSA\backend: npm run typecheck, npm run start:dev.
Run npx prisma migrate deploy after resolving Supabase connectivity if the earlier Staff & Branches migration has not been applied. Do not reset the database.
