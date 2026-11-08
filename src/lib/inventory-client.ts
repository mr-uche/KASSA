import { kassaPost } from "@/lib/kassa-client";

export type InventoryContext = {
  businessId: string;
  branchId: string;
  branchName: string;
  myRole: string;
};

export type InventoryProduct = {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  category: string;
  price: string;
  costPrice: string | null;
  stock: number;
  lowStockThreshold: number;
  status: "In stock" | "Low stock" | "Out of stock";
};

export type InventoryCategory = {
  id: string;
  name: string;
  description: string | null;
  products: number;
  stockValue: string;
  status: "Active" | "Inactive";
};

type Membership = {
  id: string;
  myRole: string;
  branches: { id: string; name: string; isActive: boolean }[];
};

export async function inventoryFetch<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  } catch {
    throw new Error("Cannot reach Kassa. Ensure your frontend and backend are running.");
  }
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const raw = data && typeof data === "object" && "message" in data
      ? (data as { message?: unknown }).message
      : null;
    const message = typeof raw === "string" ? raw
      : Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string").join(". ")
        : "Unable to load inventory.";
    throw new Error(message);
  }
  return data as T;
}

export async function getInventoryContext(): Promise<InventoryContext> {
  const memberships = await inventoryFetch<Membership[]>("/api/businesses/mine");
  if (!Array.isArray(memberships) || memberships.length === 0) {
    throw new Error("You need to set up a business before managing inventory.");
  }
  const branches = memberships.flatMap((business) =>
    (business.branches ?? []).filter((branch) => branch.isActive)
      .map((branch) => ({ ...branch, businessId: business.id, myRole: business.myRole })),
  );
  if (!branches.length) throw new Error("Your business has no active branches.");

  const selectedId = typeof window === "undefined" ? "" : localStorage.getItem("selectedBranchId") ?? "";
  const selectedName = typeof window === "undefined" ? "" : (localStorage.getItem("selectedBranch") ?? "").trim().toLowerCase();
  const preferred = branches.find((branch) => branch.id === selectedId)
    ?? branches.find((branch) => branch.name.trim().toLowerCase() === selectedName)
    ?? branches[0];
  return {
    businessId: preferred.businessId,
    branchId: preferred.id,
    branchName: preferred.name,
    myRole: preferred.myRole,
  };
}

export function getInventoryProducts(context: InventoryContext) {
  const query = new URLSearchParams({ businessId: context.businessId, branchId: context.branchId });
  return inventoryFetch<InventoryProduct[]>(`/api/inventory/products?${query}`);
}

export function getInventoryCategories(context: InventoryContext) {
  const query = new URLSearchParams({ businessId: context.businessId, branchId: context.branchId });
  return inventoryFetch<InventoryCategory[]>(`/api/inventory/categories?${query}`);
}

export function formatNaira(value: string | number): string {
  return `₦${Number(value).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

export { kassaPost };
