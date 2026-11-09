# Deploy Kassa NestJS API on Render

**Before deploying:** Kassa's NestJS API is in `backend/`. The browser-facing Next.js frontend is a separate deployment. Your phone's camera requires the **frontend** to be served over HTTPS, not merely the API.

## Option: Render Blueprint (recommended)

1. Open Render, select **New > Blueprint**, and connect the GitHub repository `winifred-001/KASSA` on branch `main`.
2. Render reads the committed root-level `render.yaml`: Node API, **root directory** `backend`, free plan in Frankfurt, and an HTTP health check at `/api/v1/health`.
3. Supply `DATABASE_URL` securely in Render when the Blueprint asks. Use the **Supabase** Postgres connection string from your Kassa project (the existing database containing your business/products). The IPv4-compatible **session pooler at port 5432** can work when direct connectivity is unavailable. Do not paste this credential into ChatGPT or commit it to GitHub.
4. Render creates `JWT_SECRET` securely on your behalf. Your local backend's JWT key can be different; users will log in again on the deployed app.
5. Render builds with `npm install --include=dev && npm run build`. It starts with `npm run start:prod`; Render provides the `PORT` automatically, and NestJS reads it.
6. When the deploy is Live, visit:
   - `https://<your-render-service>.onrender.com/api/v1/health`
   - `https://<your-render-service>.onrender.com/api/v1/health/database`
   - `https://<your-render-service>.onrender.com/api/docs` (Swagger—do not use real credentials in screenshots).

**Important:** The repo currently has no committed `backend/package-lock.json`; using `npm ci` would fail. Once a correct lockfile is added, change the build to `npm ci --include=dev && npm run build` for reproducibility.

## Migrations

If the Supabase database is already migrated and in sync with this repository, do **not** rerun development migrations. For future schema changes, run `npx prisma migrate deploy` from the `backend` directory with the correct production database URL in a controlled migration process (for example, a paid Render pre-deploy command). Do not add `prisma migrate dev` to the API start command.

## Connect the frontend

When you deploy Next.js on an HTTPS-capable host (Vercel or a Render **Web Service**, not a static export), set its **server-only** environment variable:

```dotenv
KASSA_API_URL=https://<your-render-service>.onrender.com
```

Use the real Render backend URL, **without** `/api/v1` at the end. The Next.js server routes append `/api/v1` themselves.

After the frontend has its public URL, set the backend Render environment variable `FRONTEND_URL` to the exact frontend origin (such as `https://your-kassa-frontend.vercel.app`) and redeploy. Avoid permissive wildcard CORS. Keep credentials and tokens out of `NEXT_PUBLIC_` environment variables.

**Testing warning:** Rendering a local HTTP frontend at `http://10.11.44.8:3000` is not a secure camera context, even with a deployed backend. Test the camera at the **frontend HTTPS** URL.

**Free tier:** Render free services may sleep when idle and take time to wake; do not treat that as a production-grade reliability guarantee.
