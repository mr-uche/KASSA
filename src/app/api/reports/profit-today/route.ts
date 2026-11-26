import { NextRequest, NextResponse } from "next/server";
import { forwardToBackend, sessionToken, unauthorized, upstreamError } from "@/lib/kassa-server";

export async function GET(request: NextRequest) {
  const token = sessionToken(request);
  if (!token) return unauthorized();

  const params = request.nextUrl.searchParams;
  if ([...params.keys()].some((key) => !["businessId", "branchId"].includes(key)) ||
      !params.get("businessId") || !params.get("branchId")) {
    return NextResponse.json({ message: "Select a business and branch." }, { status: 400 });
  }

  try {
    const result = await forwardToBackend(
      "/reports/profit-today?" + params.toString(), { token },
    );
    const response = NextResponse.json(result.body, { status: result.status });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return upstreamError();
  }
}
