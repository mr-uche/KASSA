"use client";

import {
  createOfflineSale, listOfflineSales, nairaToKobo,
  type OfflineSale, type OfflineWorkspace,
} from "@/lib/offline-sales";

const FORMAT = "kassa-encrypted-offline-cash-backup";
const VERSION = 1;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const KDF_ROUNDS = 310_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type BackupPayload = {
  format: typeof FORMAT;
  version: number;
  userId: string;
  businessId: string;
  branchId: string;
  createdAt: string;
  sales: OfflineSale[];
};

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let position = 0; position < bytes.length; position += 16384) {
    binary += String.fromCharCode(...bytes.subarray(position, position + 16384));
  }
  return btoa(binary);
}
function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (letter) => letter.charCodeAt(0));
}
function requirePassword(password: string) {
  if (password.length < 12 || password.length > 256) {
    throw new Error("Use a unique backup passphrase of at least 12 characters.");
  }
}
async function encryptionKey(password: string, salt: Uint8Array) {
  const secret = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new Uint8Array(salt), iterations: KDF_ROUNDS, hash: "SHA-256" },
    secret,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function createEncryptedOfflineBackup(
  workspace: OfflineWorkspace, password: string,
): Promise<{ file: Blob; filename: string; count: number }> {
  requirePassword(password);
  const sales = (await listOfflineSales(workspace)).filter((sale) => sale.status !== "synced");
  if (!sales.length) throw new Error("There are no unsynced sales to back up on this device.");
  if (sales.length > 5000) throw new Error("Too many unsynced sales for one backup. Contact support.");

  // Snapshot records exactly as saved, including permanent transaction IDs.
  const payload: BackupPayload = {
    format: FORMAT, version: VERSION, userId: workspace.userId,
    businessId: workspace.businessId, branchId: workspace.branchId,
    createdAt: new Date().toISOString(), sales,
  };
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(FORMAT) },
    key, encoder.encode(JSON.stringify(payload)),
  );
  const envelope = JSON.stringify({
    format: FORMAT, version: VERSION, iterations: KDF_ROUNDS,
    salt: toBase64(salt), iv: toBase64(iv),
    encrypted: toBase64(new Uint8Array(ciphertext)),
  });
  if (envelope.length > MAX_FILE_BYTES) {
    throw new Error("Offline backup exceeds the supported 8 MB limit.");
  }
  const date = new Date().toISOString().slice(0, 10);
  return {
    file: new Blob([envelope], { type: "application/json" }),
    filename: "kassa-offline-unsynced-" + date + ".kassa",
    count: sales.length,
  };
}

function validSale(value: unknown, scope: OfflineWorkspace): value is OfflineSale {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const sale = value as Record<string, unknown>;
  if (typeof sale.id !== "string" || !uuidV4.test(sale.id) ||
    sale.userId !== scope.userId || sale.businessId !== scope.businessId ||
    sale.branchId !== scope.branchId ||
    typeof sale.recordedAt !== "string" || !Number.isFinite(Date.parse(sale.recordedAt)) ||
    !["pending", "syncing", "needs_attention"].includes(String(sale.status)) ||
    typeof sale.total !== "string" ||
    !Array.isArray(sale.lines) || !sale.lines.length || sale.lines.length > 50) return false;

  try {
    const ids = new Set<string>();
    let sum = BigInt(0);
    for (const raw of sale.lines) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
      const line = raw as Record<string, unknown>;
      if (typeof line.productId !== "string" || !uuidV4.test(line.productId) ||
        typeof line.name !== "string" || !line.name || line.name.length > 255 ||
        !Number.isInteger(line.quantity) || Number(line.quantity) < 1 || Number(line.quantity) > 1000000 ||
        typeof line.unitPrice !== "string" || typeof line.lineTotal !== "string" ||
        ids.has(line.productId)) return false;
      ids.add(line.productId);
      const expected = nairaToKobo(line.unitPrice) * BigInt(line.quantity as number);
      if (expected <= BigInt(0) || expected !== nairaToKobo(line.lineTotal)) return false;
      sum += expected;
    }
    return sum === nairaToKobo(sale.total);
  } catch {
    return false;
  }
}

export async function restoreEncryptedOfflineBackup(
  file: File, password: string, workspace: OfflineWorkspace,
): Promise<{ restored: number; skipped: number }> {
  requirePassword(password);
  if (file.size > MAX_FILE_BYTES || file.size < 100) {
    throw new Error("Backup file is missing or exceeds the 8 MB size limit.");
  }
  if (!navigator.onLine) throw new Error("Connect to the internet and sign in before restoring a backup.");

  // Do not let a backup bypass live login or merchant/branch authorization.
  const auth = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" })
    .catch(() => null);
  if (!auth?.ok) throw new Error("Your online login could not be verified. Please sign in again.");
  const profile: unknown = await auth.json().catch(() => null);
  if (!profile || typeof profile !== "object" || (profile as { id?: unknown }).id !== workspace.userId) {
    throw new Error("Sign in as the original cashier before restoring this backup.");
  }
  const response = await fetch("/api/businesses/mine", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error("Unable to verify your business access.");
  const businesses: unknown = await response.json();
  if (!Array.isArray(businesses) || !businesses.some((business: unknown) => {
    if (!business || typeof business !== "object") return false;
    const entry = business as { id?: unknown; branches?: Array<{ id?: string }> };
    return entry.id === workspace.businessId &&
      Array.isArray(entry.branches) &&
      entry.branches.some((branch) => branch.id === workspace.branchId);
  })) throw new Error("This cashier no longer has access to the backup's branch.");

  let envelope: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(await file.text());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw Error();
    envelope = parsed as Record<string, unknown>;
  } catch {
    throw new Error("This is not a supported Kassa encrypted backup.");
  }
  if (envelope.format !== FORMAT || envelope.version !== VERSION ||
    envelope.iterations !== KDF_ROUNDS ||
    typeof envelope.salt !== "string" || typeof envelope.iv !== "string" ||
    typeof envelope.encrypted !== "string") {
    throw new Error("Unsupported or modified Kassa backup format.");
  }

  let payload: BackupPayload;
  try {
    const salt = fromBase64(envelope.salt);
    const iv = fromBase64(envelope.iv);
    if (salt.length !== 16 || iv.length !== 12) throw Error();
    const key = await encryptionKey(password, salt);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: encoder.encode(FORMAT) },
      key, fromBase64(envelope.encrypted),
    );
    payload = JSON.parse(decoder.decode(plain)) as BackupPayload;
  } catch {
    throw new Error("Could not decrypt the backup. Check your passphrase and file integrity.");
  }
  if (!payload || payload.format !== FORMAT || payload.version !== VERSION ||
    payload.userId !== workspace.userId || payload.businessId !== workspace.businessId ||
    payload.branchId !== workspace.branchId || !Array.isArray(payload.sales) ||
    payload.sales.length > 5000 || !payload.sales.every((sale) => validSale(sale, workspace))) {
    throw new Error("The backup contains invalid records or belongs to another cashier or branch.");
  }
  const known = new Set((await listOfflineSales()).map((sale) => sale.id));
  let restored = 0, skipped = 0;
  for (const entry of payload.sales) {
    if (known.has(entry.id)) { skipped++; continue; }
    const sale: OfflineSale = {
      ...entry,
      status: entry.status === "needs_attention" ? "needs_attention" : "pending",
      attempts: 0,
      // Never trust cloud-confirmation metadata from an imported file.
      cloudReference: undefined,
    };
    await createOfflineSale(sale);
    known.add(entry.id);
    restored++;
  }
  return { restored, skipped };
}
