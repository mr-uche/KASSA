import { NextRequest, NextResponse } from "next/server";
import {
  forwardToBackend, sessionToken, unauthorized, upstreamError, validateJsonRequest,
} from "@/lib/kassa-server";

type Context = { params: Promise<{ segments: string[] }> };

function resolvePath(segments: string[], method: "GET" | "POST" | "PATCH"): string | null {
  if (method !== "PATCH" && segments.length === 1 && ["categories", "products"].includes(segments[0])) {
    return segments[0];
  }
  if (
    method === "PATCH" && segments.length === 3 &&
    segments[0] === "products" && segments[2] === "barcode" &&
    /^[a-f0-9-]{36}$/i.test(segments[1])
  ) {
    return `products/${segments[1]}/barcode`;
  }
  if (
    method === "POST" && segments.length === 3 &&
    segments[0] === "products" && segments[2] === "restock" &&
    /^[a-f0-9-]{36}$/i.test(segments[1])
  ) {
    return `products/${segments[1]}/restock`;
  }
  return null;
}

async function handler(request: NextRequest, context: Context, method: "GET" | "POST" | "PATCH") {
  const token = sessionToken(request);
  if (!token) return unauthorized();
  const { segments } = await context.params;
  const path = resolvePath(segments, method);
  if (!path) return NextResponse.json({ message: "Not found" }, { status: 404 });

  let body: unknown;
  if (method !== "GET") {
    const invalid = validateJsonRequest(request);
    if (invalid) return invalid;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
    }
  }

  try {
    const query = method === "GET" ? request.nextUrl.searchParams.toString() : "";
    const result = await forwardToBackend(`/inventory/${path}${query ? `?${query}` : ""}`, {
      method, token, ...(method !== "GET" ? { body } : {}),
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return upstreamError();
  }
}

export function GET(request: NextRequest, context: Context) {
  return handler(request, context, "GET");
}

export function POST(request: NextRequest, context: Context) {
  return handler(request, context, "POST");
}

export function PATCH(request: NextRequest, context: Context) {
  return handler(request, context, "PATCH");
}
