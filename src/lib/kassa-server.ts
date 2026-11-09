import { NextRequest, NextResponse } from "next/server";

// This is a server-only helper: never expose the NestJS credentials or JWT to browser code.
export const SESSION_COOKIE = "kassa_session";
export const REMEMBER_COOKIE = "kassa_remember";
const BACKEND_URL = process.env.KASSA_API_URL ?? "http://127.0.0.1:3001";

export type ApiResult = { status: number; body: unknown };

export async function forwardToBackend(
  path: string,
  options: { method?: "GET" | "POST" | "PATCH"; body?: unknown; token?: string } = {},
): Promise<ApiResult> {
  const response = await fetch(`${BACKEND_URL}/api/v1${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  const body: unknown = await response.json().catch(() => ({
    message: "The backend returned an unexpected response.",
  }));
  return { status: response.status, body };
}

export function upstreamError(): NextResponse {
  return NextResponse.json(
    { message: "Cannot reach the Kassa backend. Make sure NestJS is running." },
    { status: 502 },
  );
}

export function sessionToken(request: NextRequest): string | undefined {
  return request.cookies.get(SESSION_COOKIE)?.value;
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ message: "Please sign in to continue." }, { status: 401 });
}

export function validateJsonRequest(request: NextRequest): NextResponse | null {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ message: "JSON request required." }, { status: 415 });
  }
  const origin = request.headers.get("origin");
  if (origin) {
    // Next.js can normalize request.nextUrl.origin to localhost even when a
    // mobile browser actually visits the dev server via its LAN IP.
    // Compare the browser's origin with the real HTTP Host as a fallback,
    // never with an arbitrary Origin allowlist or an untrusted forwarded host.
    let sameHostAndScheme = false;
    try {
      const source = new URL(origin);
      const host = request.headers.get("host");
      sameHostAndScheme =
        source.origin === origin &&
        source.host === host &&
        source.protocol === request.nextUrl.protocol;
    } catch {
      // Reject malformed or opaque origins such as "null".
    }
    if (origin !== request.nextUrl.origin && !sameHostAndScheme) {
      return NextResponse.json({ message: "Cross-origin request rejected." }, { status: 403 });
    }
  }
  return null;
}
