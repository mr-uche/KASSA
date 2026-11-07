import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE, forwardToBackend, upstreamError, validateJsonRequest,
} from "@/lib/kassa-server";

type RouteContext = { params: Promise<{ action: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { action } = await params;
  if (action !== "register" && action !== "login") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const invalid = validateJsonRequest(request);
  if (invalid) return invalid;

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const { status, body } = await forwardToBackend(`/auth/${action}`, { method: "POST", body: input });
    if (status < 200 || status >= 300) {
      return NextResponse.json(body, { status });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ message: "Authentication response was incomplete." }, { status: 502 });
    }
    const { accessToken, expiresInSeconds, ...safeBody } = body as Record<string, unknown>;
    if (typeof accessToken !== "string" || !accessToken) {
      return NextResponse.json({ message: "Authentication response was incomplete." }, { status: 502 });
    }

    const response = NextResponse.json(safeBody, { status });
    response.cookies.set(SESSION_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: typeof expiresInSeconds === "number" ? Math.min(expiresInSeconds, 900) : 900,
    });
    return response;
  } catch {
    return upstreamError();
  }
}
