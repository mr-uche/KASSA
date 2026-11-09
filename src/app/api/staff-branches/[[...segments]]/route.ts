import { NextRequest, NextResponse } from "next/server";
import {
  forwardToBackend, sessionToken, unauthorized, upstreamError, validateJsonRequest,
} from "@/lib/kassa-server";

type Context = { params: Promise<{ segments?: string[] }> };
type Method = "GET" | "POST" | "PATCH";

function route(segments: string[], method: Method) {
  const joined = segments.join("/");
  if (method === "GET" && joined === "summary") return joined;
  if (method === "GET" && joined === "invitations/preview") return joined;
  if (method === "POST" && ["branches", "roles", "invitations", "invitations/accept"].includes(joined))
    return joined;
  if (method === "PATCH" && segments[0] === "members" &&
      segments.length === 2 && /^[a-f0-9-]{36}$/i.test(segments[1])) return joined;
  if (method === "POST" && segments[0] === "invitations" &&
      segments[2] === "revoke" && segments.length === 3 &&
      /^[a-f0-9-]{36}$/i.test(segments[1])) return joined;
  return null;
}

async function handler(request: NextRequest, context: Context, method: Method) {
  const { segments = [] } = await context.params;
  const target = route(segments, method);
  if (!target) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const publicPreview = method === "GET" && target === "invitations/preview";
  const token = sessionToken(request);
  if (!publicPreview && !token) return unauthorized();

  let body: unknown;
  if (method !== "GET") {
    const invalid = validateJsonRequest(request);
    if (invalid) return invalid;
    try { body = await request.json(); }
    catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  }

  try {
    const query = method === "GET" ? request.nextUrl.searchParams.toString() : "";
    const result = await forwardToBackend(
      "/staff-branches/" + target + (query ? "?" + query : ""),
      { method, token, ...(method !== "GET" ? { body } : {}) },
    );
    const response = NextResponse.json(result.body, { status: result.status });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch { return upstreamError(); }
}

export function GET(req: NextRequest, context: Context) { return handler(req, context, "GET"); }
export function POST(req: NextRequest, context: Context) { return handler(req, context, "POST"); }
export function PATCH(req: NextRequest, context: Context) { return handler(req, context, "PATCH"); }
