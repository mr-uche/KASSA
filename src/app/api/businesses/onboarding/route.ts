import { NextRequest, NextResponse } from "next/server";
import {
  forwardToBackend, sessionToken, unauthorized, upstreamError, validateJsonRequest,
} from "@/lib/kassa-server";

export async function POST(request: NextRequest) {
  const token = sessionToken(request);
  if (!token) return unauthorized();
  const invalid = validateJsonRequest(request);
  if (invalid) return invalid;

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const { status, body } = await forwardToBackend("/businesses/onboarding", {
      method: "POST", token, body: input,
    });
    return NextResponse.json(body, { status });
  } catch {
    return upstreamError();
  }
}
