# Kassa Backend — Foundation

NestJS + PostgreSQL + Prisma 7 API for the existing Next.js frontend.

**Status:** Authentication and basic business onboarding APIs implemented. Product CRUD, staff invitation activation, verified payouts, sales, payment reconciliation and reporting APIs are **not implemented yet**. The schema remains an evolving initial design.

## Requirements (Windows)

- Node.js 24.15+ recommended (or supported Node.js 22.22.3+)
- npm
- Git for Windows
- PostgreSQL and pgAdmin (the PostgreSQL Windows installer includes both)

## 1. Create the local PostgreSQL database

Open pgAdmin, connect to your local server, then create a database named `kassa_dev` (owned by `postgres` or your dedicated development user).

## 2. Configure the environment

In a PowerShell terminal, from the KASSA repository root:

```powershell
cd backend
Copy-Item .env.example .env
```

Edit `backend/.env`. Replace `YOUR_PASSWORD` with your own PostgreSQL password and, if needed, URL-encode special characters. **Never commit your .env or share the full connection URL.**

The Next.js frontend normally runs at `http://localhost:3000`, while this API runs at `http://localhost:3001`.

## 3. Install dependencies and create tables

```powershell
npm install
npm run db:validate
npm run db:migrate -- --name init
npm run db:generate
```

Prisma migrations must only be run against the intended local development database. Don't use `migrate dev` on a production database.

## 4. Run Kassa's backend

```powershell
npm run start:dev
```

Check:

- API health: http://localhost:3001/api/v1/health
- Database health: http://localhost:3001/api/v1/health/database
- Swagger API docs: http://localhost:3001/api/docs

You should see `status: ok` on the health routes after the database is configured.

## 5. Next development milestones

1. Auth and business onboarding (password hashing, secure sessions/tokens, tenant-aware authorization).
2. Businesses, branches, roles and staff invites.
3. Product catalogue, categories, stock balances and atomic stock movement operations.
4. Customers and server-authoritative sales/checkout.
5. Provider-confirmed payments, webhook signature validation, idempotency and reconciliation.
6. Receipts, transaction histories, disputes and real reports.
7. Frontend integration without redesigning the screens; Android and iOS apps later.

**Critical financial safeguards:** never trust sale amounts supplied by the browser; verify payment events with supported providers; enforce business/branch permissions on every endpoint; avoid counting unverified payments as successful; update stock and sale records within consistent database transactions.

## Important files

- `src/main.ts`: API bootstrap, CORS, validation, Swagger
- `src/app.module.ts`: root module
- `src/health/`: smoke-test endpoints
- `src/prisma/`: PostgreSQL connection
- `prisma/schema.prisma`: initial business data model
- `prisma.config.ts`: Prisma CLI config

To regenerate the Prisma client after changing the schema:

```powershell
npm run db:generate
```

To compile after installing dependencies and generating the client:

```powershell
npm run build
```

## Auth and business onboarding (Phase 1)

After pulling these changes:

1. Run `npm install` inside `backend/` for the new JWT, bcrypt and throttling packages.
2. Generate a **new secret locally** (never commit it):
   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```
   Paste the output after `JWT_SECRET=` in your local `backend/.env`.
   If `.env` already exists, add the JWT_SECRET line yourself; copying the example again is **not** necessary.
3. With your **development** Supabase database URL configured, run:
   ```powershell
   npm run db:migrate -- --name auth_onboarding
   npm run db:generate
   npm run start:dev
   ```
4. Open http://localhost:3001/api/docs to test the new endpoints:
   - `POST /api/v1/auth/register` — create user, receive 15-minute access token
   - `POST /api/v1/auth/login` — log in
   - `GET /api/v1/auth/me` — authenticated user
   - `POST /api/v1/businesses/onboarding` — create a merchant business, owner membership, branches and pending staff drafts
   - `GET /api/v1/businesses/mine` — list only businesses the caller belongs to

### Example onboarding JSON

```json
{
  "businessName": "Demo Pharmacy",
  "businessType": "Pharmacy",
  "registeredName": "Demo Pharmacy Ltd",
  "staffCount": 4,
  "branches": [{ "name": "Main Branch", "address": "Abuja" }],
  "payoutSchedule": "daily",
  "staff": [{ "fullName": "Sample Cashier", "role": "Cashier" }]
}
```

Select **Authorize** in Swagger and paste the access token returned by register/login. Do not paste your PostgreSQL password.

### Security and implementation notes

- Passwords are salted and hashed with bcrypt; they are never returned from the API.
- JWT access tokens expire after 15 minutes; refresh tokens, secure cookie sessions, password reset and account verification are not implemented yet. Do not store access tokens in browser localStorage.
- The first onboarding request creates a business, an owner role, membership, and initial branches in one database transaction.
- Staff entries are **drafts**, not actual login accounts or delivered invitations.
- Raw bank account numbers are **not persisted**. The app saves only bank name and last four digits as an unverified preference. No payout instructions or settlement features are enabled.
- Business listings are filtered by server-verified user membership. All later tenant-owned endpoints must do equivalent permission checks.
- A basic in-memory request throttler is enabled; use shared distributed rate limiting and further anti-abuse controls before production.
- All auth routes need production HTTPS, secure browser-session handling, logging controls, audit trails and integration/security testing before real customers use them.
