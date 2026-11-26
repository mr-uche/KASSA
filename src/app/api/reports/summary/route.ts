import { NextRequest, NextResponse } from "next/server";
import { forwardToBackend, sessionToken, unauthorized, upstreamError } from "@/lib/kassa-server";

export async function GET(request: NextRequest) {
  const token = sessionToken(request);
  if (!token) return unauthorized();

  const params = request.nextUrl.searchParams;
  const allowed = ["businessId", "branchId", "from", "to", "granularity"];
  if ([...params.keys()].some((key) => !allowed.includes(key))) {
    return NextResponse.json({ message: "Unknown report filter" }, { status: 400 });
  }
  try {
    const query = params.toString();
    const result = await forwardToBackend(
      "/reports/summary" + (query ? "?" + query : ""),
      { token },
    );
    const response = NextResponse.json(result.body, { status: result.status });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return upstreamError();
  }
}
