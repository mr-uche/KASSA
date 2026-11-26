import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { CatalogItem, CheckoutSale } from './api';

export type OfflineScope = { userId: string; businessId: string; branchId: string };
export type CachedProduct = {
  id: string; name: string; sku: string; barcode: string | null;
  category: string; price: string; stock: number;
};
export type OfflineLine = {
  productId: string; name: string; quantity: number; unitPrice: string;
};
export type OfflinePaymentChannel = 'CASH' | 'POS' | 'CARD' | 'BANK_TRANSFER';
export type OfflineCashRecord = {
  id: string; recordedAt: string; status: 'QUEUED' | 'REVIEW' | 'SYNCED';
  total: string; subtotal: string; discount: string; cashReceived: string; channel: OfflinePaymentChannel;
  customerName: string | null; items: OfflineLine[];
  error: string | null;
};
type DbSale = { id: string; recordedAt: string; state: string; total: string; discount: string;
  cashReceived: string; channel: string | null; customerName: string | null;
  itemsJson: string; lastError: string | null };
type DbCatalog = {
  id: string; name: string; sku: string; barcode: string | null;
  category: string; price: string; stock: number;
};
type CatalogAge = { savedAt: number };

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
async function database() {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await SQLite.openDatabaseAsync('kassa-offline-cash.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS offline_catalog (
          userId TEXT NOT NULL, businessId TEXT NOT NULL, branchId TEXT NOT NULL,
          id TEXT NOT NULL, name TEXT NOT NULL, sku TEXT NOT NULL,
          barcode TEXT, category TEXT NOT NULL, price TEXT NOT NULL,
          stock INTEGER NOT NULL,
          PRIMARY KEY (userId,businessId,branchId,id)
        );
        CREATE TABLE IF NOT EXISTS offline_catalog_meta (
          userId TEXT NOT NULL, businessId TEXT NOT NULL, branchId TEXT NOT NULL,
          savedAt INTEGER NOT NULL,
          PRIMARY KEY (userId,businessId,branchId)
        );
        CREATE TABLE IF NOT EXISTS offline_cash_sales (
          id TEXT NOT NULL PRIMARY KEY,
          userId TEXT NOT NULL, businessId TEXT NOT NULL, branchId TEXT NOT NULL,
          recordedAt TEXT NOT NULL, state TEXT NOT NULL,
          total TEXT NOT NULL, cashReceived TEXT NOT NULL,
          itemsJson TEXT NOT NULL, lastError TEXT,
          syncedAt TEXT
        );
        CREATE INDEX IF NOT EXISTS offline_cash_sales_scope
          ON offline_cash_sales (userId,businessId,branchId,recordedAt);
      `);
      // Existing installations retain every local sale. Add nullable columns
      // without dropping the queue, catalogue or unsynced receipts.
      const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(offline_cash_sales)');
      if (!columns.some(column => column.name === 'channel')) {
        await db.execAsync("ALTER TABLE offline_cash_sales ADD COLUMN channel TEXT NOT NULL DEFAULT 'CASH'");
      }
      if (!columns.some(column => column.name === 'customerName')) {
        await db.execAsync('ALTER TABLE offline_cash_sales ADD COLUMN customerName TEXT');
      }
      if (!columns.some(column => column.name === 'discount')) {
        await db.execAsync("ALTER TABLE offline_cash_sales ADD COLUMN discount TEXT NOT NULL DEFAULT '0.00'");
      }
      return db;
    })().catch(error => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

const formatMoney = (amount: number) => amount.toFixed(2);
const params = (scope: OfflineScope) =>
  [scope.userId, scope.businessId, scope.branchId] as const;

export async function cacheOfflineCatalog(scope: OfflineScope, catalog: CatalogItem[]) {
  if (!Array.isArray(catalog) || catalog.length > 5000) throw new Error('Catalogue too large to cache');
  const db = await database();
  await db.withExclusiveTransactionAsync(async tx => {
    await tx.runAsync('DELETE FROM offline_catalog WHERE userId=? AND businessId=? AND branchId=?', ...params(scope));
    for (const item of catalog) {
      const price = Number(item.price);
      if (!item.id || !Number.isFinite(price) || price <= 0 ||
        !Number.isSafeInteger(item.stock) || item.stock < 0) continue;
      await tx.runAsync(`INSERT INTO offline_catalog
        (userId,businessId,branchId,id,name,sku,barcode,category,price,stock)
        VALUES (?,?,?,?,?,?,?,?,?,?)`,
        scope.userId, scope.businessId, scope.branchId,
        item.id, item.name, item.sku ?? '', item.barcode ?? null,
        item.category, formatMoney(price), item.stock);
    }
    await tx.runAsync(`INSERT INTO offline_catalog_meta (userId,businessId,branchId,savedAt)
      VALUES (?,?,?,?) ON CONFLICT(userId,businessId,branchId)
      DO UPDATE SET savedAt=excluded.savedAt`,
      ...params(scope), Date.now());
  });
}

export async function loadOfflineCatalogue(scope: OfflineScope) {
  const db = await database();
  const [products, age, reserved] = await Promise.all([
    db.getAllAsync<DbCatalog>(
      'SELECT id,name,sku,barcode,category,price,stock FROM offline_catalog WHERE userId=? AND businessId=? AND branchId=? ORDER BY name ASC',
      ...params(scope)),
    db.getFirstAsync<CatalogAge>(
      'SELECT savedAt FROM offline_catalog_meta WHERE userId=? AND businessId=? AND branchId=?',
      ...params(scope)),
    db.getAllAsync<{ itemsJson: string }>(
      "SELECT itemsJson FROM offline_cash_sales WHERE userId=? AND businessId=? AND branchId=? AND state != 'SYNCED'",
      ...params(scope)),
  ]);
  const pending = new Map<string, number>();
  for (const row of reserved) {
    const items = JSON.parse(row.itemsJson) as OfflineLine[];
    for (const item of items) pending.set(item.productId,
      (pending.get(item.productId) ?? 0) + item.quantity);
  }
  return {
    savedAt: age?.savedAt ?? null,
    products: products.map(item => ({
      ...item, stock: Math.max(0, item.stock - (pending.get(item.id) ?? 0)),
    })) as CachedProduct[],
  };
}

function fromDb(row: DbSale): OfflineCashRecord {
  return {
    id: row.id, recordedAt: row.recordedAt, status: row.state as OfflineCashRecord['status'],
    total: row.total, discount: row.discount, subtotal: formatMoney((Math.round(Number(row.total) * 100) + Math.round(Number(row.discount) * 100)) / 100), cashReceived: row.cashReceived,
    channel: (['CASH', 'POS', 'CARD', 'BANK_TRANSFER'].includes(row.channel ?? '')
      ? row.channel : 'CASH') as OfflinePaymentChannel,
    customerName: row.customerName ?? null,
    items: JSON.parse(row.itemsJson) as OfflineLine[], error: row.lastError,
  };
}

export async function getOfflineSales(scope: OfflineScope): Promise<OfflineCashRecord[]> {
  const db = await database();
  const records = await db.getAllAsync<DbSale>(
    'SELECT id,recordedAt,state,total,discount,cashReceived,channel,customerName,itemsJson,lastError FROM offline_cash_sales WHERE userId=? AND businessId=? AND branchId=? ORDER BY recordedAt DESC LIMIT 150',
    ...params(scope),
  );
  return records.map(fromDb);
}

export type OfflineSaleQueueStatus = { waiting: number; queued: number; review: number };

/** Count all unsynced sales, not just the latest 150 shown in history. */
export async function getOfflineSaleQueueStatus(scope: OfflineScope): Promise<OfflineSaleQueueStatus> {
  const db = await database();
  const row = await db.getFirstAsync<{ waiting: number; queued: number; review: number }>(
    `SELECT COUNT(*) AS waiting,
      COALESCE(SUM(CASE WHEN state='QUEUED' THEN 1 ELSE 0 END), 0) AS queued,
      COALESCE(SUM(CASE WHEN state='REVIEW' THEN 1 ELSE 0 END), 0) AS review
    FROM offline_cash_sales
    WHERE userId=? AND businessId=? AND branchId=? AND state!='SYNCED'`,
    ...params(scope),
  );
  return { waiting: row?.waiting ?? 0, queued: row?.queued ?? 0, review: row?.review ?? 0 };
}

export async function recordOfflineSale(scope: OfflineScope,
  selected: { productId: string; quantity: number }[], channel: OfflinePaymentChannel,
  cashReceived: number, customerName = '', discountAmount = 0, expectedTotal?: number,
): Promise<OfflineCashRecord> {
  if (!['CASH', 'POS', 'CARD', 'BANK_TRANSFER'].includes(channel) ||
      !selected.length || selected.length > 50 ||
      !Number.isFinite(cashReceived) || cashReceived < 0 ||
      customerName.trim().length > 120 ||
      new Set(selected.map(item => item.productId)).size !== selected.length) {
    throw new Error('Choose valid products and a supported payment method.');
  }
  const db = await database();
  const id = Crypto.randomUUID();
  const recordedAt = new Date().toISOString();

  const result: { saved?: OfflineCashRecord } = {};
  await db.withExclusiveTransactionAsync(async tx => {
    const age = await tx.getFirstAsync<CatalogAge>(
      'SELECT savedAt FROM offline_catalog_meta WHERE userId=? AND businessId=? AND branchId=?',
      ...params(scope));
    if (!age || Date.now() - age.savedAt > 48 * 3600000) {
      throw new Error('Offline catalogue is older than 48 hours. Reconnect and refresh stock before recording another sale.');
    }
    const products = await tx.getAllAsync<DbCatalog>(
      'SELECT id,name,sku,barcode,category,price,stock FROM offline_catalog WHERE userId=? AND businessId=? AND branchId=?',
      ...params(scope),
    );
    const productById = new Map(products.map(product => [product.id, product]));
    const existing = await tx.getAllAsync<{ itemsJson: string }>(
      "SELECT itemsJson FROM offline_cash_sales WHERE userId=? AND businessId=? AND branchId=? AND state != 'SYNCED'",
      ...params(scope),
    );
    const reserved = new Map<string, number>();
    for (const row of existing) {
      for (const line of JSON.parse(row.itemsJson) as OfflineLine[]) {
        reserved.set(line.productId, (reserved.get(line.productId) ?? 0) + line.quantity);
      }
    }
    let totalKobo = 0;
    const lines: OfflineLine[] = selected.map(item => {
      const product = productById.get(item.productId);
      if (!product || !Number.isSafeInteger(item.quantity) || item.quantity < 1 ||
          item.quantity > 1000000 || (reserved.get(item.productId) ?? 0) + item.quantity > product.stock) {
        throw new Error('Cached stock is insufficient. Review the products before recording the sale.');
      }
      const priceKobo = Math.round(Number(product.price) * 100);
      if (!Number.isSafeInteger(priceKobo) || priceKobo <= 0) throw new Error('Invalid cached selling price.');
      totalKobo += priceKobo * item.quantity;
      return { productId: item.productId, name: product.name, quantity: item.quantity, unitPrice: product.price };
    });
    const discountKobo = Math.round(discountAmount * 100);
    if (!Number.isSafeInteger(totalKobo) || !Number.isSafeInteger(discountKobo) || discountKobo < 0 || discountKobo >= totalKobo || totalKobo > 99_999_999_999_999)
      throw new Error('Invalid offline sale discount or subtotal.');
    const payableKobo = totalKobo - discountKobo;
    if (expectedTotal !== undefined && Math.round(expectedTotal * 100) !== payableKobo)
      throw new Error('Saved prices or discount changed. Review the amount collected before saving.');
    if (channel === 'CASH' && Math.round(cashReceived * 100) < payableKobo)
      throw new Error('Cash received must cover the sale total.');
    const row: OfflineCashRecord = {
      id, recordedAt, status: 'QUEUED', total: formatMoney(payableKobo / 100),
      subtotal: formatMoney(totalKobo / 100), discount: formatMoney(discountKobo / 100),
      cashReceived: formatMoney(channel === 'CASH' ? cashReceived : payableKobo / 100),
      channel, customerName: customerName.trim() || null, items: lines, error: null,
    };
    await tx.runAsync(`INSERT INTO offline_cash_sales
      (id,userId,businessId,branchId,recordedAt,state,total,discount,cashReceived,channel,customerName,itemsJson)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      row.id, ...params(scope), row.recordedAt, row.status, row.total, row.discount, row.cashReceived,
      row.channel, row.customerName, JSON.stringify(lines));
    result.saved = row;
  });
  // Only return the receipt once SQLite has committed the exclusive transaction.
  if (!result.saved) throw new Error('Offline sale could not be recorded.');
  return result.saved;
}

// Keep the old public function for the separate offline-cash queue screen.
export function recordOfflineCash(scope: OfflineScope,
  selected: { productId: string; quantity: number }[], cashReceived: number,
): Promise<OfflineCashRecord> {
  return recordOfflineSale(scope, selected, 'CASH', cashReceived);
}

let syncing = false;
export async function syncOfflineCash(scope: OfflineScope,
  request: <T>(path: string, body: unknown) => Promise<T>,
  retryReview = false,
): Promise<{ synced: number; review: number; remaining: number }> {
  if (syncing) return { synced: 0, review: 0, remaining: 0 };
  syncing = true;
  try {
    const db = await database();
    const rows = await db.getAllAsync<DbSale>(
      `SELECT id,recordedAt,state,total,discount,cashReceived,channel,customerName,itemsJson,lastError
       FROM offline_cash_sales WHERE userId=? AND businessId=? AND branchId=?
         AND (state='QUEUED' ${retryReview ? "OR state='REVIEW'" : ""})
       ORDER BY recordedAt ASC LIMIT 100`,
      ...params(scope),
    );
    let synced = 0;
    let review = 0;
    for (const row of rows) {
      const lines = JSON.parse(row.itemsJson) as OfflineLine[];
      try {
        const sale = await request<CheckoutSale>('sales/offline-sync', {
          businessId: scope.businessId, branchId: scope.branchId, clientRequestId: row.id,
          recordedAt: row.recordedAt, channel: row.channel || 'CASH',
          ...(row.channel === 'CASH' || !row.channel ? { cashReceived: true } : { confirmedReceived: true }),
          ...(row.customerName?.trim() ? { customerName: row.customerName.trim() } : {}),
          ...(Number(row.discount) > 0 ? { discountAmount: row.discount } : {}),
          items: lines.map(line => ({
            productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice,
          })),
        });
        if (sale.status !== 'PAID' || Math.round(Number(sale.total) * 100) !== Math.round(Number(row.total) * 100) ||
          Math.round(Number(sale.discount ?? 0) * 100) !== Math.round(Number(row.discount) * 100) || !sale.payments.some(payment =>
          payment.channel === (row.channel || 'CASH') && payment.status === 'SUCCEEDED' &&
          payment.provider === ((row.channel || 'CASH') === 'CASH' ? 'OFFLINE_CASH' : 'OFFLINE_MERCHANT_ATTESTED'))) {
          throw new Error('Offline sale totals or payment conflict: owner review required.');
        }
        await db.runAsync(
          "UPDATE offline_cash_sales SET state='SYNCED',lastError=NULL,syncedAt=? WHERE id=?",
          new Date().toISOString(), row.id);
        synced += 1;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Could not sync sale.';
        if (/conflict|insufficient|changed|owner review|reconciliation|date is outside|price differs|unavailable|retry|400|409/i.test(message)) {
          await db.runAsync("UPDATE offline_cash_sales SET state='REVIEW',lastError=? WHERE id=?", message, row.id);
          review += 1;
          continue;
        }
        // Connectivity/authorization failures remain in the queue with the same
        // immutable transaction ID, for safe idempotent retry when online.
        await db.runAsync("UPDATE offline_cash_sales SET lastError=? WHERE id=?", message, row.id);
        break;
      }
    }
    const pending = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM offline_cash_sales WHERE userId=? AND businessId=? AND branchId=? AND state!='SYNCED'",
      ...params(scope),
    );
    return { synced, review, remaining: pending?.count ?? 0 };
  } finally { syncing = false; }
}
