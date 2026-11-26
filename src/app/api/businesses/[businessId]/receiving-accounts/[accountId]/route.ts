import { NextRequest, NextResponse } from "next/server";
import { forwardToBackend, sessionToken, unauthorized, upstreamError, validateJsonRequest } from "@/lib/kassa-server";

type Context = { params: Promise<{ businessId: string; accountId: string }> };
const validId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export async function PATCH(request: NextRequest, context: Context) {
  const token = sessionToken(request);
  if (!token) return unauthorized();
  const invalid = validateJsonRequest(request);
  if (invalid) return invalid;
  const { businessId, accountId } = await context.params;
  if (!validId(businessId) || !validId(accountId))
    return NextResponse.json({ message: "Invalid account identifier" }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  try {
    const result = await forwardToBackend(
      "/businesses/" + businessId + "/receiving-accounts/" + accountId,
      { method: "PATCH", token, body },
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch { return upstreamError(); }
}

export async function DELETE(request: NextRequest, context: Context) {
  const token = sessionToken(request);
  if (!token) return unauthorized();
  const { businessId, accountId } = await context.params;
  if (!validId(businessId) || !validId(accountId))
    return NextResponse.json({ message: "Invalid account identifier" }, { status: 400 });
  try {
    const result = await forwardToBackend(
      "/businesses/" + businessId + "/receiving-accounts/" + accountId,
      { method: "DELETE", token },
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch { return upstreamError(); }
}
