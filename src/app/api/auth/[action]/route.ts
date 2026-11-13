import { NextRequest, NextResponse } from "next/server";
import {
  REMEMBER_COOKIE, SESSION_COOKIE, forwardToBackend, upstreamError, validateJsonRequest,
} from "@/lib/kassa-server";

type RouteContext = { params: Promise<{ action: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { action } = await params;
  if (!["register", "login", "register-invite"].includes(action)) {
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
    const backendPath = action === "register-invite"
      ? "/staff-branches/invitations/register" : "/auth/" + action;
    const { status, body } = await forwardToBackend(backendPath, { method: "POST", body: input });
    if (status < 200 || status >= 300) {
      return NextResponse.json(body, { status });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ message: "Authentication response was incomplete." }, { status: 502 });
    }
    const { accessToken, expiresInSeconds, refreshToken, refreshExpiresInSeconds, ...safeBody } =
      body as Record<string, unknown>;
    if (typeof accessToken !== "string" || !accessToken) {
      return NextResponse.json({ message: "Authentication response was incomplete." }, { status: 502 });
    }
    const rememberMe = action === "login" &&
      input !== null && typeof input === "object" && !Array.isArray(input) &&
      (input as Record<string, unknown>).rememberMe === true;

    // Do not leak either token to browser JavaScript; both are HttpOnly cookies.
    if (rememberMe && (typeof refreshToken !== "string" || !refreshToken)) {
      return NextResponse.json({ message: "Remembered session could not be started." }, { status: 502 });
    }

    // On a successful new login, revoke any previously remembered session
    // for this browser, including when the checkbox is now unchecked.
    const previousRememberToken = request.cookies.get(REMEMBER_COOKIE)?.value;
    if (previousRememberToken) {
      try {
        await forwardToBackend("/auth/logout", {
          method: "POST", body: { refreshToken: previousRememberToken },
        });
      } catch {
        // Clearing the old cookie still prevents using that session locally.
      }
    }

    const response = NextResponse.json(safeBody, { status });
    const settings = {
      httpOnly: true as const,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };
    response.cookies.set(SESSION_COOKIE, accessToken, {
      ...settings,
      ...(rememberMe
        ? { maxAge: typeof expiresInSeconds === "number" ? Math.min(expiresInSeconds, 900) : 900 }
        : {}),
    });
    if (rememberMe && typeof refreshToken === "string") {
      response.cookies.set(REMEMBER_COOKIE, refreshToken, {
        ...settings,
        maxAge: typeof refreshExpiresInSeconds === "number"
          ? Math.min(refreshExpiresInSeconds, 30 * 86400) : 30 * 86400,
      });
    } else {
      // Normal login and registration do not carry over an older remembered session.
      response.cookies.delete(REMEMBER_COOKIE);
    }
    return response;
  } catch {
    return upstreamError();
  }
}
