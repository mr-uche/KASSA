import { NextRequest, NextResponse } from "next/server";
import { forwardToBackend, sessionToken, unauthorized, upstreamError, validateJsonRequest } from "@/lib/kassa-server";

type Context = { params: Promise<{ businessId: string }> };
const validId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export async function GET(request: NextRequest, context: Context) {
  const token = sessionToken(request);
  if (!token) return unauthorized();
  const { businessId } = await context.params;
  if (!validId(businessId)) return NextResponse.json({ message: "Invalid business ID" }, { status: 400 });
  try {
    const result = await forwardToBackend("/businesses/" + businessId + "/receiving-accounts", { token });
    return NextResponse.json(result.body, { status: result.status });
  } catch { return upstreamError(); }
}

export async function POST(request: NextRequest, context: Context) {
  const token = sessionToken(request);
  if (!token) return unauthorized();
  const invalid = validateJsonRequest(request);
  if (invalid) return invalid;
  const { businessId } = await context.params;
  if (!validId(businessId)) return NextResponse.json({ message: "Invalid business ID" }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  try {
    const result = await forwardToBackend("/businesses/" + businessId + "/receiving-accounts", {
      method: "POST", token, body,
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch { return upstreamError(); }
}
