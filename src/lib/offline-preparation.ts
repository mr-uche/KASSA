"use client";

import { getInventoryContext, getInventoryProducts } from "@/lib/inventory-client";
import { hasBusinessAccess, loadAccess } from "@/lib/kassa-permissions";
import { listCheckoutProducts } from "@/lib/sales-client";
import {
  getOfflineActiveUser, getOfflineWorkspace, listOfflineSales,
  saveOfflineWorkspace, workspaceFresh, type OfflineWorkspace,
} from "@/lib/offline-sales";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

/** Prepare only the current authenticated employee's cached role, branch and
 * safe catalogue. Never fetch other staff accounts' cached data. */
export async function prepareCurrentStaffOffline(
  userId: string, force = false,
): Promise<OfflineWorkspace> {
  if (!navigator.onLine || (await getOfflineActiveUser()) !== userId) {
    throw new Error("Sign in online before preparing offline access.");
  }

  const previous = await getOfflineWorkspace();
  const [context, memberships] = await Promise.all([getInventoryContext(), loadAccess()]);
  const business = memberships.find((entry) => entry.id === context.businessId &&
    entry.branches.some((branch) => branch.id === context.branchId && branch.isActive));

  if (!business) {
    // If online membership was explicitly removed, invalidate the cached
    // capabilities but retain all unsynced sales for subsequent reconciliation.
    if (previous) {
      await saveOfflineWorkspace({ ...previous, role: "", permissions: [] });
    }
    throw new Error("This staff account has no active branch membership.");
  }

  const canSell = hasBusinessAccess(business, "Manage sales & transactions");
  const canStock = hasBusinessAccess(business, "Manage products & inventory");
  const hasOfflineView = canSell || canStock ||
    hasBusinessAccess(business, "View dashboard") ||
    hasBusinessAccess(business, "View reports & analytics");
  const verifiedRole = business.myRole;
  const verifiedPermissions = business.myPermissions ?? [];

  if (!hasOfflineView) {
    if (previous) {
      await saveOfflineWorkspace({
        ...previous, role: verifiedRole, permissions: verifiedPermissions,
      });
    }
    throw new Error("Your staff role has no offline-enabled sections.");
  }

  const sameScope = previous?.userId === userId &&
    previous.businessId === context.businessId &&
    previous.branchId === context.branchId;

  if (previous && !sameScope) {
    const unsynced = (await listOfflineSales(previous))
      .some((sale) => sale.status !== "synced");
    if (unsynced) {
      throw new Error(
        "This account has pending sales for another branch. Sync or back them up before switching branches.",
      );
    }
  }

  if (sameScope && workspaceFresh(previous) && !force &&
    Date.now() - Date.parse(previous.cachedAt) < REFRESH_INTERVAL_MS) {
    const updated: OfflineWorkspace = {
      ...previous,
      role: verifiedRole,
      permissions: verifiedPermissions,
    };
    await saveOfflineWorkspace(updated);
    window.dispatchEvent(new Event("kassa-offline-catalogue-updated"));
    return updated;
  }

  // Cashiers receive only checkout-safe products. Inventory staff can use the
  // stock catalogue, but cost-price and internal details are not cached.
  const catalogue = canSell ? await listCheckoutProducts(context)
    : canStock ? await getInventoryProducts(context) : [];

  const workspace: OfflineWorkspace = {
    userId,
    businessId: context.businessId, branchId: context.branchId,
    businessName: ("name" in business && typeof business.name === "string")
      ? business.name : "Kassa merchant",
    branchName: context.branchName,
    role: verifiedRole, permissions: verifiedPermissions,
    cachedAt: new Date().toISOString(),
    products: catalogue.map((product) => ({
      id: product.id, name: product.name, sku: product.sku,
      barcode: product.barcode, category: product.category,
      price: product.price, stock: product.stock,
    })),
  };
  await saveOfflineWorkspace(workspace);
  window.dispatchEvent(new Event("kassa-offline-catalogue-updated"));
  return workspace;
}
