# Kassa — Remember me login (30-day remembered session)

## Behaviour
- **Unchecked** (default): Log in with a short-lived 15-minute JWT in an HttpOnly **browser-session cookie**. No persistent refresh token is issued. Closing the browser removes the session cookie, and the access JWT cannot be used after it expires.
- **Checked**: Log in with the same short-lived access JWT, plus an opaque 256-bit random refresh token stored in a separate HttpOnly, SameSite=Lax cookie (Secure in production) lasting up to **30 days**. The server stores only its SHA-256 hash, with an absolute expiry; refreshes do not reset the 30-day clock.
- When opening protected pages or calling authenticated Next.js APIs, the Next.js proxy transparently renews nearly expired access tokens with a valid remembered session. NestJS continues to validate all access tokens and business permissions.
- **Logout** revokes the remembered session in Supabase and deletes both cookies; it does not store credentials in localStorage or expose JWT/refresh tokens to browser JavaScript.
- Signing in again replaces and attempts to revoke the previous remembered session for this browser.
- If the browser cookies are cleared, a session is revoked, or 30 days elapse, the user must sign in again. Only select Remember me on a private device.

## One-time database migration (required)
The new `AuthSession` table stores the hashed refresh token, user ID, creation and expiration timestamps, and revocation timestamp.

From `C:\dev\KASSA\backend`, after `git pull origin main`:
```powershell
npx prisma migrate deploy
npm run db:generate
npm run typecheck
npm run start:dev
```
**The new feature will fail to create a remembered session until this migration has been applied.**

From the project root in another terminal:
```powershell
npx tsc --noEmit
npm run dev
```

Do not commit `.env` or any database password.

## Manual test checklist
1. Sign in **without** checking Remember me: confirm login and API calls work. Access lasts up to 15 minutes; no persistent refresh token is created.
2. Log out and confirm Dashboard and Products redirect to login.
3. Sign in again with **Remember me** checked: verify login works and customer/products pages load.
4. Leave the app idle for over 15 minutes, then refresh a protected page: the app should renew its access token automatically instead of displaying an expired-login error.
5. Close and reopen the browser (preserving cookies) and return to Dashboard: the remembered session should still work.
6. Log out, then reopen the browser: Dashboard should require sign-in. An old refresh token must no longer work.
7. Log in with Remember me checked, then log in again *unchecked*: the previous remembered cookie is removed and the old remembered backend session is revoked (when the backend is reachable).
8. Test expired or revoked refresh token: it must never create a new access token.
9. Verify login throttling, registration, checkout and all other authenticated endpoints still work.

## API and security details
- `POST /api/v1/auth/login` accepts `rememberMe?: boolean`. When true, backend returns a refresh token **only to the Next.js API route**, not the browser response body.
- `POST /api/v1/auth/refresh` accepts `{ "refreshToken": "..." }` and issues a new 15-minute JWT if the stored token hash is valid, unrevoked and unexpired.
- `POST /api/v1/auth/logout` revokes a refresh token by hash.
- JWTs remain access-scoped, expire in 15 minutes, and are *never* extended to 30 days.
- Refresh token expiry is absolute; a lost or stolen refresh token remains usable until revoked or expired. Browser cookies are HttpOnly/SameSite=Lax and Secure on HTTPS in production. Consider adding refresh-token rotation, device management, and anomalous-session detection before production rollout.

Code committed to the `main` branch. This has not yet been run against the user's Supabase database or exercised in a browser.
