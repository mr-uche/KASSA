import { NextResponse, type NextRequest } from "next/server";

// Optimistic UI redirect only. Every API endpoint must also verify auth and tenant permissions.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("kassa_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
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
  ],
};
