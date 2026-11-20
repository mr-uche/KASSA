import { NextRequest, NextResponse } from "next/server";
import { forwardToBackend, sessionToken, unauthorized, upstreamError, validateJsonRequest } from "@/lib/kassa-server";

type Context = { params: Promise<{ action: string }> };
const isUuid = (value: string) => /^[0-9a-f-]{36}$/i.test(value);

export async function GET(request: NextRequest, context: Context) {
  const token = sessionToken(request);
  if (!token) return unauthorized();
  const { action } = await context.params;
  if (action !== "status") return NextResponse.json({ message: "Not found" }, { status: 404 });
  const businessId = request.nextUrl.searchParams.get("businessId") ?? "";
  if (!isUuid(businessId)) return NextResponse.json({ message: "Invalid business" }, { status: 400 });
  try {
    const result = await forwardToBackend("/billing/status?businessId=" + encodeURIComponent(businessId), { token });
    const response = NextResponse.json(result.body, { status: result.status });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch { return upstreamError(); }
}

export async function POST(request: NextRequest, context: Context) {
  const token = sessionToken(request);
  if (!token) return unauthorized();
  const invalid = validateJsonRequest(request);
  if (invalid) return invalid;
  const { action } = await context.params;
  if (!["initialize", "verify"].includes(action)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      !("businessId" in body) || !isUuid(String(body.businessId))) {
    return NextResponse.json({ message: "Invalid business" }, { status: 400 });
  }
  try {
    const result = await forwardToBackend("/billing/" + action, {
      method: "POST", token, body,
    });
    const response = NextResponse.json(result.body, { status: result.status });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch { return upstreamError(); }
}
