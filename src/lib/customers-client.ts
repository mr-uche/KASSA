import { getInventoryContext, inventoryFetch, kassaPost } from "@/lib/inventory-client";

export type CustomerRecord = {
  id: string;
  businessId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  purchases: number;
  lastPurchase: string | null;
};

export type CustomerDetail = Omit<CustomerRecord, "purchases" | "lastPurchase">;

export type CustomerInput = {
  fullName: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
};

export async function getCustomerBusiness() {
  const context = await getInventoryContext();
  return { businessId: context.businessId, branchName: context.branchName };
}

export async function listCustomers(businessId: string) {
  const query = new URLSearchParams({ businessId });
  return inventoryFetch<CustomerRecord[]>("/api/customers?" + query);
}

export async function getCustomer(businessId: string, id: string) {
  const query = new URLSearchParams({ businessId });
  return inventoryFetch<CustomerDetail>(
    "/api/customers/" + encodeURIComponent(id) + "?" + query,
  );
}

export function createCustomer(businessId: string, input: CustomerInput) {
  return kassaPost<CustomerRecord>("/api/customers", { businessId, ...input });
}

export async function updateCustomer(businessId: string, id: string, input: CustomerInput) {
  let response: Response;
  try {
    response = await fetch("/api/customers/" + encodeURIComponent(id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ businessId, ...input }),
    });
  } catch {
    throw new Error("Cannot connect to Kassa. Check that the frontend and backend are running.");
  }
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data && typeof data === "object" && "message" in data
      ? (data as { message: unknown }).message : null;
    throw new Error(
      typeof message === "string" ? message :
      Array.isArray(message) ? message.filter((part): part is string => typeof part === "string").join(". ") :
      "Unable to save customer changes.",
    );
  }
  return data as CustomerDetail;
}
