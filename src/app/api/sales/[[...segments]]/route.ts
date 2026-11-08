import { NextRequest, NextResponse } from "next/server";
import {
  forwardToBackend, sessionToken, unauthorized, upstreamError, validateJsonRequest,
} from "@/lib/kassa-server";

type Context = { params: Promise<{ segments?: string[] }> };

function pathFrom(segments: string[]): string | null {
  if (segments.length === 0) return "/sales";
  if (segments.length > 2 || !/^[0-9a-f-]{36}$/i.test(segments[0])) return null;
  if (segments.length === 2 && segments[1] !== "confirm-cash") return null;
  return "/sales/" + segments.join("/");
}

async function handler(request: NextRequest, context: Context, method: "GET" | "POST") {
  const token = sessionToken(request);
  if (!token) return unauthorized();
  const { segments = [] } = await context.params;
  const path = pathFrom(segments);
  if (!path || (method === "GET" && segments.length === 2))
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (method === "POST" && !(segments.length === 0 || (segments.length === 2 && segments[1] === "confirm-cash")))
    return NextResponse.json({ message: "Not found" }, { status: 404 });

  let body: unknown;
  if (method === "POST") {
    const invalid = validateJsonRequest(request);
    if (invalid) return invalid;
    try { body = await request.json(); }
    catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  }
  try {
    const query = method === "GET" && !segments.length ? request.nextUrl.searchParams.toString() : "";
    const result = await forwardToBackend(path + (query ? "?" + query : ""), {
      method, token, ...(method === "POST" ? { body } : {}),
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch { return upstreamError(); }
}

export function GET(request: NextRequest, context: Context) {
  return handler(request, context, "GET");
}
export function POST(request: NextRequest, context: Context) {
  return handler(request, context, "POST");
}
