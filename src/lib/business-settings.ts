import { inventoryFetch } from "@/lib/inventory-client";

export type PayoutSchedule = "INSTANT" | "DAILY" | "WEEKLY";

export type BusinessSettings = {
  businessId: string;
  businessName: string;
  businessType: string;
  branchId: string | null;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  payoutSchedule: PayoutSchedule;
  settlementBankName: string | null;
  settlementAccountLast4: string | null;
  payoutVerified: false;
};

export function getBusinessSettings(businessId: string, branchId: string): Promise<BusinessSettings> {
  const query = new URLSearchParams({ branchId });
  return inventoryFetch<BusinessSettings>(
    "/api/businesses/" + encodeURIComponent(businessId) + "/settings?" + query.toString(),
  );
}

export async function updateBusinessSettings(
  businessId: string,
  changes: Partial<Pick<BusinessSettings,
    "businessName" | "businessType" | "branchId" | "branchAddress" | "branchPhone" | "payoutSchedule">>,
): Promise<BusinessSettings> {
  let response: Response;
  try {
    response = await fetch("/api/businesses/" + encodeURIComponent(businessId) + "/settings", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
      cache: "no-store",
    });
  } catch {
    throw new Error("Cannot reach Kassa to save settings.");
  }
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body
      ? (body as { message: unknown }).message : null;
    throw new Error(typeof message === "string" ? message :
      Array.isArray(message) ? message.join(". ") : "Unable to save settings.");
  }
  return body as BusinessSettings;
}
