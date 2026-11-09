import { NextResponse, type NextRequest } from "next/server";
import { REMEMBER_COOKIE, SESSION_COOKIE, forwardToBackend } from "@/lib/kassa-server";

// This function only determines whether a token needs renewal;
// NestJS validates the JWT signature and all permissions on every API request.
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

function invalidSession(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  const response = isApi
    ? NextResponse.json({ message: "Your session has expired. Please sign in." }, { status: 401 })
    : NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(REMEMBER_COOKIE);
  return response;
}

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (!aboutToExpire(accessToken)) {
    return NextResponse.next();
  }

  const rememberToken = request.cookies.get(REMEMBER_COOKIE)?.value;
  if (!rememberToken) return invalidSession(request);

  let result: { status: number; body: unknown };
  try {
    result = await forwardToBackend("/auth/refresh", {
      method: "POST",
      body: { refreshToken: rememberToken },
    });
  } catch {
    // Do not delete a remembered session merely because the backend is offline.
    return request.nextUrl.pathname.startsWith("/api/")
      ? NextResponse.json({ message: "Unable to renew session; try again shortly." }, { status: 502 })
      : NextResponse.redirect(new URL("/login?session=unavailable", request.url));
  }

  if (result.status < 200 || result.status >= 300 ||
      !result.body || typeof result.body !== "object" ||
      !("accessToken" in result.body) ||
      typeof result.body.accessToken !== "string") {
    return invalidSession(request);
  }

  const freshToken = result.body.accessToken;
  // Forward the new access cookie to the current API/page request immediately,
  // then persist it in an HttpOnly cookie for subsequent requests.
  request.cookies.set(SESSION_COOKIE, freshToken);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(SESSION_COOKIE, freshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 900,
  });
  return response;
}

export const config = {
  matcher: [
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
