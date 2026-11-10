import { NextRequest, NextResponse } from "next/server";
import {
  forwardToBackend, sessionToken, unauthorized, upstreamError,
  validateJsonRequest, SESSION_COOKIE, REMEMBER_COOKIE,
} from "@/lib/kassa-server";

export async function DELETE(request: NextRequest) {
  const token = sessionToken(request);
  if (!token) return unauthorized();
  const invalid = validateJsonRequest(request);
  if (invalid) return invalid;

  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }

  try {
    const result = await forwardToBackend("/auth/me", {
      method: "DELETE", token, body: input,
    });
    const response = NextResponse.json(result.body, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
    if (result.status >= 200 && result.status < 300) {
      response.cookies.delete(SESSION_COOKIE);
      response.cookies.delete(REMEMBER_COOKIE);
    }
    return response;
  } catch { return upstreamError(); }
}
