# Kassa web frontend — Authentication and onboarding integration

The existing Next.js screen layouts are preserved. The initial frontend phase connects:

- Sign-up form -> POST /api/auth/register -> NestJS /api/v1/auth/register
- Login form -> POST /api/auth/login -> NestJS /api/v1/auth/login
- Authenticated user -> GET /api/auth/me
- Business wizard -> POST /api/businesses/onboarding
- Merchant memberships -> GET /api/businesses/mine
- Sidebar logout -> POST /api/auth/logout

## Local setup (two VS Code terminals)

Terminal A: `cd backend && npm run start:dev` (port 3001)

Terminal B (repository root): `npm install && npm run dev` (port 3000)

For local development, no root .env.local is needed unless NestJS is on a different host.
When deploying the Next.js frontend, set **KASSA_API_URL** to your deployed backend HTTPS origin in the Next.js hosting environment. Do **not** expose it as a `NEXT_PUBLIC_` variable.

The Next.js server stores NestJS's 15-minute access token in an HttpOnly, SameSite=Lax cookie. No token is written to localStorage. After expiry, sign in again. Browser "Remember me" is disabled until secure refresh-session support is implemented.

**What is *not* ready yet**: product CRUD, persistent dashboard totals, actual payouts, real sales and payment capture, inventory sync, email invitations, password reset, and subscription payments. Current dashboard widgets and most other screens still display demo data. This is a development/testing integration only; do not deploy to merchants until these flows are implemented and security-tested.

The `src/proxy.ts` check only redirects users who have no session cookie. It is **not** the security boundary; the NestJS backend must verify JWTs and business/branch access for every operation.

To test:
1. Register with a new email and a 12+ character password.
2. Confirm you are taken to the existing 4-step onboarding screen; the business name/type prefill.
3. Complete onboarding and confirm you reach the dashboard.
4. Log out, then log in; existing users with businesses should go to the dashboard.
5. Confirm that skipping sign-in and opening /dashboard redirects to /login.

**Note**: staff onboarding entries are saved as drafts; payout details are unverified preferences. The "Save and exit", login "Forgot password", and business logo upload UI are not connected yet, and the Terms/Privacy pages need to be implemented before a production launch.

If you have previously manually registered a user in Swagger, sign in using that account instead of registering it again.
