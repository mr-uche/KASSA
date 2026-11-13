import { NextRequest, NextResponse } from "next/server";
import {
  REMEMBER_COOKIE, SESSION_COOKIE, forwardToBackend, validateJsonRequest,
} from "@/lib/kassa-server";

export async function POST(request: NextRequest) {
  const invalid = validateJsonRequest(request);
  if (invalid) return invalid;

  // Revoke any long-lived session in the backend before deleting browser cookies.
  const refreshToken = request.cookies.get(REMEMBER_COOKIE)?.value;
  if (refreshToken) {
    try {
      await forwardToBackend("/auth/logout", {
        method: "POST", body: { refreshToken },
      });
    } catch {
      // Sign out locally even if the backend cannot be reached.
      // The server session also has a fixed expiry after 30 days.
    }
  }

  const response = NextResponse.json({ message: "Signed out" });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(REMEMBER_COOKIE);
  return response;
}
