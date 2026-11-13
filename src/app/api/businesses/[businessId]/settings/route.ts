import { NextRequest, NextResponse } from "next/server";
import {
  forwardToBackend, sessionToken, unauthorized, upstreamError, validateJsonRequest,
} from "@/lib/kassa-server";

type Context = { params: Promise<{ businessId: string }> };
const isUuid = (value: string) => /^[0-9a-f-]{36}$/i.test(value);

export async function GET(request: NextRequest, context: Context) {
  const token = sessionToken(request);
  if (!token) return unauthorized();
  const { businessId } = await context.params;
  if (!isUuid(businessId)) return NextResponse.json({ message: "Invalid business ID" }, { status: 400 });
  const branchId = request.nextUrl.searchParams.get("branchId");
  if (branchId && !isUuid(branchId)) return NextResponse.json({ message: "Invalid branch ID" }, { status: 400 });
  try {
    const result = await forwardToBackend(
      "/businesses/" + businessId + "/settings" +
      (branchId ? "?branchId=" + encodeURIComponent(branchId) : ""), { token },
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch { return upstreamError(); }
}

export async function PATCH(request: NextRequest, context: Context) {
  const token = sessionToken(request);
  if (!token) return unauthorized();
  const invalid = validateJsonRequest(request);
  if (invalid) return invalid;
  const { businessId } = await context.params;
  if (!isUuid(businessId)) return NextResponse.json({ message: "Invalid business ID" }, { status: 400 });
  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  try {
    const result = await forwardToBackend("/businesses/" + businessId + "/settings", {
      method: "PATCH", token, body: input,
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch { return upstreamError(); }
}
