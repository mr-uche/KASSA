import { NextRequest, NextResponse } from "next/server";
import {
  forwardToBackend, sessionToken, unauthorized, upstreamError, validateJsonRequest,
} from "@/lib/kassa-server";

type Context = { params: Promise<{ action: string }> };
const allowed = new Set(["initialize", "verify", "reconcile"]);

export async function POST(request: NextRequest, context: Context) {
  const token = sessionToken(request);
  if (!token) return unauthorized();
  const invalid = validateJsonRequest(request);
  if (invalid) return invalid;
  const { action } = await context.params;
  if (!allowed.has(action)) return NextResponse.json({ message: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }

  try {
    const result = await forwardToBackend("/payments/paystack/" + action, {
      method: "POST", token, body,
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch { return upstreamError(); }
}
