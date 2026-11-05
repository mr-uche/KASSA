# Kassa Backend — Foundation

NestJS + PostgreSQL + Prisma 7 API for the existing Next.js frontend.

**Status:** Foundation scaffold only. Authentication, business onboarding, product CRUD, sales, payment verification and reporting routes are **not implemented yet**. The database model is an initial design that will evolve as those modules are built.

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
