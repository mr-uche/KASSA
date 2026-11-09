import { NextResponse, type NextRequest } from "next/server";
import { REMEMBER_COOKIE, SESSION_COOKIE, forwardToBackend } from "@/lib/kassa-server";

// The access JWT is short-lived; its expiry is inspected only as an optimization.
// Actual JWT signature and authorization checks are performed by NestJS.
function aboutToExpire(token: string | undefined): boolean {
  if (!token) return true;
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const raw = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = raw.padEnd(Math.ceil(raw.length / 4) * 4, "=");
    const data: unknown = JSON.parse(atob(padded));
    const exp = data && typeof data === "object" && "exp" in data
      ? (data as { exp?: unknown }).exp : undefined;
    return typeof exp !== "number" || exp * 1000 <= Date.now() + 30_000;
  } catch {
    return true;
  }
}

const entryRoutes = new Set(["/", "/login", "/sign-up"]);
const cookieOptions = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

function clearSessionCookies(response: NextResponse) {
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(REMEMBER_COOKIE);
  return response;
}

function invalidSession(request: NextRequest, isEntryRoute: boolean) {
  if (isEntryRoute) return clearSessionCookies(NextResponse.next());
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  const response = isApi
    ? NextResponse.json({ message: "Your session has expired. Please sign in." }, { status: 401 })
    : NextResponse.redirect(new URL("/login", request.url));
  return clearSessionCookies(response);
}

// Opening the app at '/', '/login', or '/sign-up' must not show a login form to
// someone whose cookie is still valid. Query the backend to VERIFY that cookie
// and choose between Dashboard and Onboarding (without trusting JWT claims).
async function restoreEntrySession(request: NextRequest, token: string, isFresh: boolean) {
  try {
    const result = await forwardToBackend("/businesses/mine", { token });
    if (result.status === 401 || result.status === 403) {
      return invalidSession(request, true);
    }
    if (result.status !== 200 || !Array.isArray(result.body)) {
      // An upstream problem should not silently revoke a remembered session.
      return NextResponse.next();
    }
    const destination = result.body.length ? "/dashboard" : "/onboarding";
    const response = NextResponse.redirect(new URL(destination, request.url));
    if (isFresh) {
      response.cookies.set(SESSION_COOKIE, token, { ...cookieOptions, maxAge: 900 });
    }
    return response;
  } catch {
    // Keep the remembered session when Supabase or NestJS is temporarily offline.
    return NextResponse.next();
  }
}

export async function proxy(request: NextRequest) {
  const isEntryRoute = entryRoutes.has(request.nextUrl.pathname);
  const accessToken = request.cookies.get(SESSION_COOKIE)?.value;

  if (!aboutToExpire(accessToken) && accessToken) {
    if (isEntryRoute) return restoreEntrySession(request, accessToken, false);
    return NextResponse.next();
  }

  const rememberToken = request.cookies.get(REMEMBER_COOKIE)?.value;
  if (!rememberToken) {
    return isEntryRoute ? NextResponse.next() : invalidSession(request, false);
  }

  let result: { status: number; body: unknown };
  try {
    result = await forwardToBackend("/auth/refresh", {
      method: "POST",
      body: { refreshToken: rememberToken },
    });
  } catch {
    // Temporary connectivity failures must not destroy a valid remembered session.
    return isEntryRoute ? NextResponse.next() :
      request.nextUrl.pathname.startsWith("/api/")
        ? NextResponse.json({ message: "Unable to renew session; try again shortly." }, { status: 502 })
        : NextResponse.redirect(new URL("/login?session=unavailable", request.url));
  }

  // A bad or revoked token is different from a temporary backend/database failure.
  // Preserve the long-lived cookie on 5xx, 429, or unexpected upstream responses.
  if (result.status === 401 || result.status === 403) {
    return invalidSession(request, isEntryRoute);
  }
  if (result.status !== 200 ||
      !result.body || typeof result.body !== "object" ||
      !("accessToken" in result.body) ||
      typeof result.body.accessToken !== "string") {
    return isEntryRoute ? NextResponse.next() :
      request.nextUrl.pathname.startsWith("/api/")
        ? NextResponse.json({ message: "Session renewal is temporarily unavailable." }, { status: 503 })
        : NextResponse.redirect(new URL("/login?session=unavailable", request.url));
  }

  const freshToken = result.body.accessToken;
  if (isEntryRoute) {
    return restoreEntrySession(request, freshToken, true);
  }

  // Pass the renewed access cookie to the current API/page request immediately,
  // as well as to the browser for subsequent requests.
  request.cookies.set(SESSION_COOKIE, freshToken);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(SESSION_COOKIE, freshToken, { ...cookieOptions, maxAge: 900 });
  return response;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/sign-up",
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/customers/:path*",
    "/products/:path*",
    "/reports/:path*",
    "/sales/:path*",
    "/scan/:path*",
    "/settings/:path*",
    "/staff-branches/:path*",
    "/transactions/:path*",
    "/api/auth/me",
    "/api/businesses/:path*",
    "/api/customers/:path*",
    "/api/inventory/:path*",
    "/api/sales/:path*",
  ],
};
