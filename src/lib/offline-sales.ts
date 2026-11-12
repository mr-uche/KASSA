"use client";

import type { InventoryProduct } from "@/lib/inventory-client";

const DB_NAME = "kassa-offline-sales-v1";
const DATABASE_VERSION = 1;
const ENC = new TextEncoder();
const DEC = new TextDecoder();
export const OFFLINE_CACHE_DAYS = 7;

export type OfflineProduct = Pick<InventoryProduct,
  "id" | "name" | "sku" | "barcode" | "category" | "price" | "stock">;
export type OfflineWorkspace = {
  userId: string;
  businessId: string;
  branchId: string;
  businessName: string;
  branchName: string;
  cachedAt: string;
  // Offline permissions are an expiring snapshot, not live server authorization.
  role?: string;
  permissions?: string[];
  products: OfflineProduct[];
};
export type OfflineLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};
export type OfflineSale = {
  id: string; userId: string; businessId: string; branchId: string;
  recordedAt: string; lines: OfflineLine[];
  total: string; status: "pending" | "syncing" | "synced" | "needs_attention";
  attempts: number;
  lastError?: string;
  cloudReference?: string;
};
type CipherRecord = { id: string; iv: Uint8Array; encrypted: ArrayBuffer };
let dbPromise: Promise<IDBDatabase> | null = null;
let keyPromise: Promise<CryptoKey> | null = null;
let syncPromise: Promise<void> | null = null;

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Local storage request failed"));
  });
}
function completed(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Offline storage transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("Offline storage transaction was aborted"));
  });
}
function db(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser does not support secure local sales storage"));
      return;
    }
    const open = indexedDB.open(DB_NAME, DATABASE_VERSION);
    open.onupgradeneeded = () => {
      const database = open.result;
      if (!database.objectStoreNames.contains("keys")) database.createObjectStore("keys");
      if (!database.objectStoreNames.contains("workspace")) database.createObjectStore("workspace", { keyPath: "id" });
      if (!database.objectStoreNames.contains("sales")) database.createObjectStore("sales", { keyPath: "id" });
    };
    open.onsuccess = () => {
      open.result.onversionchange = () => open.result.close();
      resolve(open.result);
    };
    open.onerror = () => reject(open.error ?? new Error("Unable to open offline sales database"));
    open.onblocked = () => reject(new Error("Close other Kassa tabs to update the offline database"));
  }).catch((error) => { dbPromise = null; throw error; });
  return dbPromise!;
}
async function encryptionKey(): Promise<CryptoKey> {
  if (!keyPromise) keyPromise = (async () => {
    if (!crypto?.subtle) throw new Error("Offline storage encryption requires HTTPS");
    const database = await db();
    const stored = await request(database.transaction("keys", "readonly").objectStore("keys").get("primary"));
    if (stored instanceof CryptoKey) return stored;
    // Non-exportable device key is structured-cloned into IndexedDB.
    // It protects records at rest but is not a substitute for a future offline PIN
    // and physical device security policy.
    const created = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    const tx = database.transaction("keys", "readwrite");
    const done = completed(tx);
    const store = tx.objectStore("keys");
    // Recheck inside the write transaction so two tabs starting together
    // cannot replace the other tab's encryption key.
    const existingInWrite = await request<CryptoKey | undefined>(store.get("primary"));
    if (!existingInWrite) store.put(created, "primary");
    await done;
    return existingInWrite ?? created;
  })().catch((error) => { keyPromise = null; throw error; });
  return keyPromise;
}
async function seal(id: string, value: unknown): Promise<CipherRecord> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, await encryptionKey(), ENC.encode(JSON.stringify(value)),
  );
  return { id, iv, encrypted };
}
async function unseal<T>(record: CipherRecord): Promise<T> {
  const bytes = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(record.iv) }, await encryptionKey(), record.encrypted,
  );
  return JSON.parse(DEC.decode(bytes)) as T;
}
async function getRecord<T>(store: "workspace" | "sales", id: string): Promise<T | null> {
  const database = await db();
  const value = await request<CipherRecord | undefined>(
    database.transaction(store, "readonly").objectStore(store).get(id),
  );
  return value ? unseal<T>(value) : null;
}
async function storeRecord<T>(store: "workspace" | "sales", id: string, value: T, newOnly = false): Promise<void> {
  const sealed = await seal(id, value);
  const database = await db();
  const tx = database.transaction(store, "readwrite");
  const done = completed(tx);
  if (newOnly) tx.objectStore(store).add(sealed);
  else tx.objectStore(store).put(sealed);
  await done; // Success means the IndexedDB transaction has committed.
}

/** Scoped offline role checks prevent the cached catalogue from becoming
 * a back door into reports, inventory administration or other staff data. */
export function offlineSectionAllowed(section: string, workspace: OfflineWorkspace | null): boolean {
  if (!workspace || !workspace.role || !Array.isArray(workspace.permissions)) return false;
  const can = (name: string) => workspace.role === "Owner" || workspace.permissions!.includes(name);
  switch (section) {
    case "home": return can("View dashboard") || can("Manage sales & transactions");
    case "new-sale":
    case "transactions":
    case "scan":
    case "backup": return can("Manage sales & transactions");
    case "reports": return can("View reports & analytics");
    case "products": return can("Manage products & inventory");
    case "customers": return can("Manage customers");
    default: return false;
  }
}

/** Only the last online-authenticated user can access an offline workspace.
 * The marker persists across restarts, but is cleared on explicit logout.
 * A missing marker never falls back to the previous cashier's data.
 */
type ActiveOfflineAccount = { userId: string | null; verifiedAt: string };
const ACTIVE_ACCOUNT_KEY = "active-account";
const workspaceKey = (userId: string) => "user:" + userId;

export async function getOfflineActiveUser(): Promise<string | null> {
  const marker = await getRecord<ActiveOfflineAccount>("workspace", ACTIVE_ACCOUNT_KEY);
  if (!marker || typeof marker.userId !== "string" || !marker.userId) return null;
  const verified = Date.parse(marker.verifiedAt);
  if (!Number.isFinite(verified) || verified > Date.now() + 300000 ||
    Date.now() - verified >= OFFLINE_CACHE_DAYS * 86400_000) return null;
  return marker.userId;
}

export async function setOfflineActiveUser(userId: string | null): Promise<void> {
  if (userId !== null && (typeof userId !== "string" || !userId)) {
    throw new Error("Cannot activate an unidentified offline account.");
  }
  const previous = await getOfflineActiveUser();
  await storeRecord("workspace", ACTIVE_ACCOUNT_KEY, {
    userId, verifiedAt: new Date().toISOString(),
  } satisfies ActiveOfflineAccount);
  if (previous !== userId) {
    window.dispatchEvent(new Event("kassa-offline-account-changed"));
  }
}
export async function getOfflineWorkspace(): Promise<OfflineWorkspace | null> {
  const currentUser = await getOfflineActiveUser();
  if (!currentUser) return null;
  const scoped = await getRecord<OfflineWorkspace>("workspace", workspaceKey(currentUser));
  if (scoped) return scoped.userId === currentUser ? scoped : null;
  // Preserve older device cache on upgrade, but never expose it to another user.
  const legacy = await getRecord<OfflineWorkspace>("workspace", "active");
  return legacy?.userId === currentUser ? legacy : null;
}
export async function saveOfflineWorkspace(value: OfflineWorkspace): Promise<void> {
  if (await getOfflineActiveUser() !== value.userId) {
    throw new Error("Offline workspace does not match the signed-in cashier.");
  }
  await storeRecord("workspace", workspaceKey(value.userId), value);
  if (navigator.storage?.persist) {
    // Best effort; the browser can refuse. Storage is not a cloud backup.
    await navigator.storage.persist().catch(() => false);
  }
}
export function workspaceFresh(workspace: OfflineWorkspace): boolean {
  const cachedAt = Date.parse(workspace.cachedAt);
  return Number.isFinite(cachedAt) && cachedAt <= Date.now() + 5 * 60_000 &&
    Date.now() - cachedAt < OFFLINE_CACHE_DAYS * 86400_000;
}
export async function listOfflineSales(workspace?: Pick<OfflineWorkspace, "userId" | "businessId" | "branchId">): Promise<OfflineSale[]> {
  const database = await db();
  const records = await request<CipherRecord[]>(database.transaction("sales", "readonly").objectStore("sales").getAll());
  const decoded = await Promise.all(records.map(unseal<OfflineSale>));
  return decoded.filter((sale) => !workspace ||
    (sale.userId === workspace.userId && sale.businessId === workspace.businessId && sale.branchId === workspace.branchId))
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}
export async function createOfflineSale(sale: OfflineSale): Promise<void> {
  // Never overwrite a previously recorded sale or regenerate its UUID.
  await storeRecord("sales", sale.id, sale, true);
}
async function updateSale(sale: OfflineSale): Promise<void> {
  await storeRecord("sales", sale.id, sale);
}

/** Owner can retry an unchanged transaction after correcting server inventory.
 * Reuse the exact original ID; never generate a second sale for this cash. */
export async function retryReviewedOfflineSale(id: string): Promise<void> {
  const saved = await getRecord<OfflineSale>("sales", id);
  if (!saved || saved.status !== "needs_attention") return;
  await updateSale({ ...saved, status: "pending", lastError: undefined });
}
export function nairaToKobo(amount: string): bigint {
  if (!/^(?:0|[1-9][0-9]{0,10})(?:\.[0-9]{1,2})?$/.test(amount)) {
    throw new Error("Invalid saved offline price");
  }
  const [whole, decimal = ""] = amount.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(decimal.padEnd(2, "0"));
}
export function koboToNaira(amount: bigint): string {
  return (amount / BigInt(100)).toString() + "." + (amount % BigInt(100)).toString().padStart(2, "0");
}
export function availableOfflineStock(product: OfflineProduct, sales: OfflineSale[], cachedAt: string): number {
  // Subtract every sale not yet reflected in the cached cloud stock. Pending
  // sales always count; synced sales count only if recorded after cache time.
  const taken = sales.filter((sale) =>
    sale.status !== "synced" || Date.parse(sale.recordedAt) >= Date.parse(cachedAt)).reduce((sum, sale) =>
    sum + sale.lines.filter((line) => line.productId === product.id)
      .reduce((lineSum, line) => lineSum + line.quantity, 0), 0);
  return Math.max(0, product.stock - taken);
}

async function syncUnconfirmedSales(): Promise<void> {
  if (navigator.onLine === false) return;
  const workspace = await getOfflineWorkspace();
  if (!workspace || !offlineSectionAllowed("new-sale", workspace) || !workspaceFresh(workspace)) return;
  const pending = (await listOfflineSales(workspace)).filter((sale) => sale.status === "pending" || sale.status === "syncing");
  for (const sale of pending.reverse()) {
    const current: OfflineSale = { ...sale, status: "syncing", attempts: sale.attempts + 1, lastError: undefined };
    await updateSale(current);
    window.dispatchEvent(new Event("kassa-offline-sync-update"));
    try {
      const response = await fetch("/api/sales/offline-sync", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: sale.businessId, branchId: sale.branchId,
          clientRequestId: sale.id, recordedAt: sale.recordedAt,
          cashReceived: true,
          items: sale.lines.map((line) => ({
            productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice,
          })),
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      const details = body && typeof body === "object" ? body as Record<string, unknown> : {};
      if (response.ok && details.status === "PAID" && typeof details.reference === "string") {
        await updateSale({ ...current, status: "synced", cloudReference: details.reference, lastError: undefined });
      } else {
        // NestJS serializes ConflictException({code,message}) inside the
        // top-level "message" property. Handle either shape reliably.
        const nested = details.message && typeof details.message === "object"
          && !Array.isArray(details.message)
          ? details.message as Record<string, unknown> : null;
        const code = typeof details.code === "string" ? details.code
          : typeof nested?.code === "string" ? nested.code : "";
        const message = typeof details.message === "string" ? details.message
          : typeof nested?.message === "string" ? nested.message
            : "Cloud sync could not complete; this sale was kept on the device.";
        const conflict = response.status === 400 || response.status === 403 ||
          (response.status === 409 && code !== "OFFLINE_RETRY_LATER");
        await updateSale({ ...current, status: conflict ? "needs_attention" : "pending", lastError: message });
        if (response.status === 401 || response.status >= 500) break;
      }
    } catch {
      await updateSale({ ...current, status: "pending", lastError: "Connection interrupted. Sale remains safely on this device." });
      break;
    } finally {
      window.dispatchEvent(new Event("kassa-offline-sync-update"));
    }
  }
}
/** Synchronize while the page is open. Browser background sync when fully
 * closed is intentionally not promised on unsupported platforms. */
export function syncOfflineSales(): Promise<void> {
  if (syncPromise) return syncPromise;
  syncPromise = syncUnconfirmedSales().finally(() => { syncPromise = null; });
  return syncPromise;
}
