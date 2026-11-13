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
  // A sleeping or temporarily unreachable backend can take a moment to wake
  // up. Retry only transient failures, never 401/403 permission errors.
  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response;
    try {
      response = await fetch("/api/businesses/mine", {
        cache: "no-store",
        credentials: "same-origin",
      });
    } catch {
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 800));
        continue;
      }
      throw new Error("Could not connect to Kassa. Your remembered session has not been cleared; please retry.");
    }
    if ([502, 503, 504].includes(response.status) && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 800));
      continue;
    }

    const body: unknown = await response.json().catch(() => null);
    if (response.status === 401) {
      throw new Error("Your login session has expired or is no longer valid. Please sign in again.");
    }
    if (response.status === 403) {
      throw new Error("Your account does not have permission to access this business.");
    }
    if (!response.ok) {
      throw new Error(response.status >= 500
        ? "Kassa could not reach the backend right now. Your remembered login has not been cleared; please retry."
        : "Unable to check your business access right now.");
    }
    if (!Array.isArray(body)) {
      throw new Error("Received an invalid permissions response.");
    }
    return body as BusinessAccess[];
  }
  throw new Error("Unable to check business access right now. Please retry.");
}

export function firstPermittedPath(businesses: BusinessAccess[]): string {
  if (!businesses.length) return "/onboarding";
  const priorities: Array<[KassaPermission | "Owner", string]> = [
    ["View dashboard", "/dashboard"],
    ["Manage sales & transactions", "/sales/new"],
    ["Manage products & inventory", "/products"],
    ["View reports & analytics", "/reports"],
    ["Manage customers", "/customers"],
    ["Owner", "/staff-branches"],
  ];
  for (const business of businesses) {
    for (const [permission, path] of priorities) {
      if (hasBusinessAccess(business, permission)) return path;
    }
  }
  // A valid business membership can exist with zero extra permissions.
  return "/dashboard";
}
