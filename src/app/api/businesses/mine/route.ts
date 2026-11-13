import { NextRequest } from "next/server";
import { authenticatedRead } from "@/lib/kassa-server";

// Access gate, menu and onboarding depend on this read. Attempt one safe
// refresh when an expired access cookie would otherwise cause a false logout.
export async function GET(request: NextRequest) {
  return authenticatedRead(request, "/businesses/mine");
}
