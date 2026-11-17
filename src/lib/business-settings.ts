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

/** Bank details are entered by the business owner; not verified by an external bank. */
export type MerchantBankAccount = {
  id: string;
  businessId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
};

export type MerchantBankAccountInput = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault?: boolean;
};

async function merchantAccountRequest<T>(url: string, method: "POST" | "PATCH" | "DELETE", body?: object): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method, credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store",
    });
  } catch { throw new Error("Could not reach KASSA to update the receiving account."); }
  const result: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = result && typeof result === "object" && "message" in result
      ? (result as { message: unknown }).message : null;
    throw new Error(typeof message === "string" ? message
      : Array.isArray(message) ? message.join(". ") : "Unable to update receiving account.");
  }
  return result as T;
}

export function getMerchantBankAccounts(businessId: string): Promise<MerchantBankAccount[]> {
  return inventoryFetch<MerchantBankAccount[]>(
    "/api/businesses/" + encodeURIComponent(businessId) + "/receiving-accounts",
  );
}

export function addMerchantBankAccount(businessId: string, input: MerchantBankAccountInput): Promise<MerchantBankAccount> {
  return merchantAccountRequest<MerchantBankAccount>(
    "/api/businesses/" + encodeURIComponent(businessId) + "/receiving-accounts", "POST", input,
  );
}

export function updateMerchantBankAccount(businessId: string, accountId: string,
  changes: Partial<MerchantBankAccountInput>): Promise<MerchantBankAccount> {
  return merchantAccountRequest<MerchantBankAccount>(
    "/api/businesses/" + encodeURIComponent(businessId) + "/receiving-accounts/" + encodeURIComponent(accountId),
    "PATCH", changes,
  );
}

export function deleteMerchantBankAccount(businessId: string, accountId: string): Promise<{ deleted: boolean }> {
  return merchantAccountRequest<{ deleted: boolean }>(
    "/api/businesses/" + encodeURIComponent(businessId) + "/receiving-accounts/" + encodeURIComponent(accountId),
    "DELETE",
  );
}
