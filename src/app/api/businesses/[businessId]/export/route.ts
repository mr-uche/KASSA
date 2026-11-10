import { NextRequest, NextResponse } from "next/server";
import {
  forwardToBackend, sessionToken, unauthorized, upstreamError, validateJsonRequest,
} from "@/lib/kassa-server";

type Context = { params: Promise<{ businessId: string }> };

export async function POST(request: NextRequest, context: Context) {
  const token = sessionToken(request);
  if (!token) return unauthorized();
  const invalid = validateJsonRequest(request);
  if (invalid) return invalid;
  const { businessId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(businessId)) {
    return NextResponse.json({ message: "Invalid business ID" }, { status: 400 });
  }
  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }

  try {
    const result = await forwardToBackend("/businesses/" + businessId + "/export", {
      method: "POST", token, body: input,
    });
    return NextResponse.json(result.body, {
      status: result.status, headers: { "Cache-Control": "private, no-store" },
    });
  } catch { return upstreamError(); }
}
