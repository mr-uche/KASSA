import { NextRequest } from "next/server";
import { authenticatedRead } from "@/lib/kassa-server";

// If a short-lived JWT has expired, this also restores it from a valid
// HttpOnly Remember Me cookie without exposing the refresh token to the client.
export async function GET(request: NextRequest) {
  return authenticatedRead(request, "/auth/me");
}
