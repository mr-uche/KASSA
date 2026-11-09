export const KASSA_PERMISSIONS = {
  dashboard: "View dashboard",
  sales: "Manage sales & transactions",
  inventory: "Manage products & inventory",
  reports: "View reports & analytics",
  customers: "Manage customers",
} as const;

export type KassaPermission = (typeof KASSA_PERMISSIONS)[keyof typeof KASSA_PERMISSIONS];
export type BusinessAccess = {
  id: string;
  myRole: string;
  myPermissions?: string[];
  branches: { id: string; name: string; isActive: boolean }[];
};

export function selectedBusiness(memberships: BusinessAccess[], selectedBranchId: string): BusinessAccess | undefined {
  return memberships.find((item) => item.branches.some((branch) => branch.id === selectedBranchId)) ?? memberships[0];
}

export function hasBusinessAccess(
  business: BusinessAccess | undefined,
  permission: KassaPermission | "Owner",
): boolean {
  if (!business) return false;
  if (business.myRole === "Owner") return true;
  if (permission === "Owner") return false;
  return business.myPermissions?.includes(permission) === true;
}

export async function loadAccess(): Promise<BusinessAccess[]> {
  let response: Response;
  try {
    response = await fetch("/api/businesses/mine", {
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new Error("Could not connect to Kassa. Please check your connection.");
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error("Unable to check your business access right now.");
  }
  if (!Array.isArray(body)) {
    throw new Error("Received an invalid permissions response.");
  }
  return body as BusinessAccess[];
}
