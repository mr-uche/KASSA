import { NextRequest, NextResponse } from "next/server";
import {
  forwardToBackend, sessionToken, unauthorized, upstreamError, validateJsonRequest,
} from "@/lib/kassa-server";

type Context = { params: Promise<{ segments?: string[] }> };

async function handle(request: NextRequest, context: Context, method: "GET" | "POST" | "PATCH") {
  const token = sessionToken(request);
  if (!token) return unauthorized();

  const { segments = [] } = await context.params;
  if (
    segments.length > 1 ||
    (segments.length === 1 && !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(segments[0])) ||
    (method === "POST" && segments.length > 0) ||
    (method === "PATCH" && segments.length !== 1)
  ) return NextResponse.json({ message: "Not found" }, { status: 404 });

  let body: unknown;
  if (method !== "GET") {
    const invalid = validateJsonRequest(request);
    if (invalid) return invalid;
    try { body = await request.json(); }
    catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  }
  try {
    const query = method === "GET" ? request.nextUrl.searchParams.toString() : "";
    const path = "/customers" + (segments.length ? "/" + segments[0] : "") +
      (query ? "?" + query : "");
    const response = await forwardToBackend(path, {
      method, token, ...(method !== "GET" ? { body } : {}),
    });
    return NextResponse.json(response.body, { status: response.status });
  } catch { return upstreamError(); }
}

export function GET(request: NextRequest, context: Context) {
  return handle(request, context, "GET");
}
export function POST(request: NextRequest, context: Context) {
  return handle(request, context, "POST");
}
export function PATCH(request: NextRequest, context: Context) {
  return handle(request, context, "PATCH");
}
