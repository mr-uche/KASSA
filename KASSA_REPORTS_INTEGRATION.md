# Kassa Reports & Analytics integration

Reports use live PostgreSQL aggregates rather than hardcoded chart data or the last 100 sales.
Only paid sales with a successful payment count towards confirmed gross sales. Pending electronic payments are not counted as revenue.

## UI

- Four range tabs: Daily (last 7 days), Weekly (last 6 calendar weeks), Monthly (last 6 calendar months), Custom range.
- Quick custom ranges: last 30 days, current quarter, year to date, or custom inclusive calendar dates.
- Branch selector: owner may choose all branches or one; staff are restricted to their assigned active branch.
- Confirmed gross sales, average paid sale, completed/failed payment rate, branch performance, channel breakdown, daily/weekly/monthly stacked trend chart.
- Sales by cashier, top-selling products, confirmed transactions and pending counts.
- CSV export includes precisely the selected report scope and date range.
- Empty periods show zeroes and appropriate explanations, never made-up example transactions.

## Backend

GET /api/v1/reports/summary
Required query params: businessId (uuid), from (YYYY-MM-DD), to (YYYY-MM-DD), granularity (day, week, month).
Optional: branchId (uuid). Maximum 366 calendar days, inclusive.
Access requires business membership and View reports & analytics permission, or Owner status.
Backend validates branch ownership, enforces assigned active branch for non-owner staff and limits results to current business.
Reporting dates are Africa/Lagos (UTC+1). Date filters apply to sale creation time.
Amounts are aggregated inside PostgreSQL with decimal precision, and returned as decimal strings.
Gross sales are not profit and are not equivalent to bank settlement.
Previous-period comparison uses a period of equal length immediately preceding the selected period.
No new database migration is needed solely for Reports.

## Test instructions

1. Pull main and run npm run typecheck from backend, then npm run start:dev.
2. Run npx next typegen and npx tsc --noEmit from the frontend root, then npm run dev.
3. Sign in as owner; open /reports. The default Daily view should contain only confirmed sales from the last seven days.
4. Create a pending transfer test sale. It must not increase confirmed gross sales or the corresponding channel revenue.
5. Confirm a real/test cash sale after indicating receipt. It should increase confirmed sales and its channel and staff/branch/product totals.
6. Change Daily/Weekly/Monthly/Custom date ranges and branch selection. Check empty results, failed payment rate N/A, and CSV export.
7. Try reports with a staff account without View reports & analytics permission; expect 403. With the permission it should only see its assigned branch.
8. Check that no historical customer/staff/sample figures appear.
9. Test a date range longer than 366 days: API should return 400.

## Important prerequisite from Staff & Branches

If the backend reports P2022: Branch.code does not exist, the earlier Staff & Branches migration has not been applied to the database.
Stop backend and run npx prisma migrate deploy inside C:\dev\KASSA\backend; then npx prisma migrate status, npm run db:generate, npm run typecheck and npm run start:dev.
Do not run prisma migrate reset, and do not change the schema manually.

## Current limitations

- Failed payment rate is based on the currently selected representative payment status for each sale; full provider-attempt analytics require payment gateway integration.
- Partial refunds, taxes, net profit and reconciliation are not implemented; gross confirmed sales are not a substitute for financial accounting.
- Staff permission configuration does not automatically enable every dashboard widget; Sales/Inventory/Customers use separate permissions.
- CSV export is client-side and can contain sensitive business information.
- Changes have been pushed to GitHub but were not compiled or browser-tested on the user's local machine.
