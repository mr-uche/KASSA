import { NextRequest, NextResponse } from "next/server";
import { forwardToBackend, sessionToken, unauthorized, upstreamError } from "@/lib/kassa-server";

export async function GET(request: NextRequest) {
  const token = sessionToken(request);
  if (!token) return unauthorized();
  try {
    const { status, body } = await forwardToBackend("/auth/me", { token });
    return NextResponse.json(body, { status });
  } catch {
    return upstreamError();
  }
}
