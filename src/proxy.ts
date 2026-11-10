import { NextRequest, NextResponse } from "next/server";
import {
  REMEMBER_COOKIE, SESSION_COOKIE, forwardToBackend,
} from "@/lib/kassa-server";

// This is only an optimization to decide *when* to ask the backend to refresh.
// JWT claims read here are never used to authorize a request. NestJS still
// verifies signature, audience, issuer, scope, user existence and permissions.
export function accessTokenNeedsRefresh(token: string | undefined, nowMs = Date.now()): boolean {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts.every(Boolean)) return true;
    const payload: unknown = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (!payload || typeof payload !== "object" || !("exp" in payload)) return true;
    const exp = (payload as { exp: unknown }).exp;
    if (typeof exp !== "number" || !Number.isSafeInteger(exp)) return true;
    return exp * 1000 <= nowMs + 45_000;
  } catch {
    return true;
  }
}

function isCredentialCreation(pathname: string) {
  return pathname === "/api/auth/login" ||
    pathname === "/api/auth/register" ||
    pathname === "/api/auth/register-invite" ||
    pathname === "/api/auth/logout";
}

export async function proxy(request: NextRequest) {
  const remembered = request.cookies.get(REMEMBER_COOKIE)?.value;
  if (!remembered || isCredentialCreation(request.nextUrl.pathname) ||
      !accessTokenNeedsRefresh(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  try {
    // A remembered token is opaque and never exposed to browser JavaScript.
    // Validation and revocation happen in NestJS against the stored SHA-256
    // session hash and 30-day fixed expiry.
    const result = await forwardToBackend("/auth/refresh", {
      method: "POST",
      body: { refreshToken: remembered },
    });
    if (result.status === 200 && result.body && typeof result.body === "object" &&
        !Array.isArray(result.body)) {
      const body = result.body as Record<string, unknown>;
      const token = body.accessToken;
      const expiresInSeconds = body.expiresInSeconds;
      if (typeof token === "string" && token.length > 30 &&
          typeof expiresInSeconds === "number" && expiresInSeconds > 0 &&
          !accessTokenNeedsRefresh(token, Date.now() - 45_000)) {
        // Update the *upstream request* immediately, so this same API
        // handler can already authenticate without a second request.
        request.cookies.set(SESSION_COOKIE, token);
        const response = NextResponse.next({ request: { headers: new Headers(request.headers) } });
        response.cookies.set(SESSION_COOKIE, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: Math.min(Math.floor(expiresInSeconds), 900),
        });
        return response;
      }
    }
    if (result.status === 401) {
      // A revoked/expired remembered session must never cause repeated retry
      // traffic. Clear both credentials in the browser and the API request.
      request.cookies.delete(REMEMBER_COOKIE);
      request.cookies.delete(SESSION_COOKIE);
      const response = NextResponse.next({ request: { headers: new Headers(request.headers) } });
      response.cookies.delete(REMEMBER_COOKIE);
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
  } catch {
    // If Render is temporarily unreachable, do not destroy an otherwise
    // valid remembered login. A later request can retry the refresh.
  }
  return NextResponse.next();
}

// Next.js 16's Proxy runs before API route handlers and protected pages.
// Authentication/authorization themselves always remain inside NestJS.
export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/products/:path*",
    "/customers/:path*",
    "/reports/:path*",
    "/sales/:path*",
    "/scan/:path*",
    "/settings/:path*",
    "/staff-branches/:path*",
    "/staff-invite/:path*",
    "/transactions/:path*",
  ],
};
