import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, validateJsonRequest } from "@/lib/kassa-server";

export function POST(request: NextRequest) {
  const invalid = validateJsonRequest(request);
  if (invalid) return invalid;
  const response = NextResponse.json({ message: "Signed out" });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
