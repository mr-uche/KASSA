import { NextRequest, NextResponse } from "next/server";
import { forwardToBackend, sessionToken, unauthorized, upstreamError, validateJsonRequest } from "@/lib/kassa-server";

type Context = { params: Promise<{ segments?: string[] }> };

function supportedPath(segments: string[], method: "GET" | "POST"): string | null {
  if (method === "GET" && segments.length === 1 && segments[0] === "inbox") return "/support/inbox";
  if (segments.length >= 2 && segments[0] === "inbox" &&
      /^[0-9a-f-]{36}$/i.test(segments[1])) {
    if (method === "GET" && segments.length === 2) return "/support/inbox/" + segments[1];
    if (method === "POST" && segments.length === 3 && segments[2] === "reply")
      return "/support/inbox/" + segments[1] + "/reply";
  }
  return null;
}

async function handle(request: NextRequest, context: Context, method: "GET" | "POST") {
  const token = sessionToken(request);
  if (!token) return unauthorized();
  const { segments = [] } = await context.params;
  const path = supportedPath(segments, method);
  if (!path) return NextResponse.json({ message: "Not found" }, { status: 404 });
  let body: unknown;
  if (method === "POST") {
    const invalid = validateJsonRequest(request);
    if (invalid) return invalid;
    try { body = await request.json(); }
    catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  }
  try {
    const result = await forwardToBackend(path, {
      method, token, ...(method === "POST" ? { body } : {}),
    });
    const response = NextResponse.json(result.body, { status: result.status });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return upstreamError();
  }
}
export function GET(request: NextRequest, context: Context) {
  return handle(request, context, "GET");
}
export function POST(request: NextRequest, context: Context) {
  return handle(request, context, "POST");
}
