import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { type Product } from './data';
import { useKassaSession, type CatalogItem, type CheckoutSale } from './api';
import { toKobo } from './theme';
import { cacheOfflineCatalog, getOfflineSaleQueueStatus, loadOfflineCatalogue, syncOfflineCash, type OfflineSaleQueueStatus, type OfflineScope } from './offline-cash';
import { useKassaConnectivity } from './connectivity';

export type SaleLine = { id: string; quantity: number };
export type CompletedPayment = { sale: CheckoutSale; cashReceived: number | null; change: number };
type DemoStore = {
  lines: SaleLine[];
  branch: string;
  paymentMethod: string;
  customerName: string;
  subtotal: number;
  discount: number;
  discountValid: boolean;
  discountType: 'fixed' | 'percent';
  discountInput: string;
  setDiscountType(value: 'fixed' | 'percent'): void;
  setDiscountInput(value: string): void;
  total: number;
  count: number;
  catalog: Product[];
  catalogSource: 'live' | 'cached' | 'none';
  catalogSavedAt: number | null;
  offlineMode: boolean;
  offlineQueue: OfflineSaleQueueStatus | null;
  syncingOfflineSales: boolean;
  loadingCatalog: boolean;
  catalogError: string | null;
  pendingSale: CheckoutSale | null;
  completedPayment: CompletedPayment | null;
  add(id: string): void;
  subtract(id: string): void;
  remove(id: string): void;
  clear(): void;
  beginNewSale(): void;
  refreshCatalog(): Promise<void>;
  refreshOfflineQueue(): Promise<void>;
  setBranch(value: string): void;
  setPaymentMethod(value: string): void;
  setCustomerName(value: string): void;
  setPendingSale(value: CheckoutSale | null): void;
  setCompletedPayment(value: CompletedPayment | null): void;
};
const DemoContext = createContext<DemoStore | null>(null);

export function KassaDemoProvider({ children }: { children: React.ReactNode }) {
  const session = useKassaSession();
  const scope = session.scope;
  const { disconnected } = useKassaConnectivity();
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [branch, setBranch] = useState('Main Branch');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customerName, setCustomerName] = useState('');
  const [discountType, setDiscountTypeState] = useState<'fixed' | 'percent'>('fixed');
  const [discountInput, setDiscountInputState] = useState('');
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogSource, setCatalogSource] = useState<'live' | 'cached' | 'none'>('none');
  const [catalogSavedAt, setCatalogSavedAt] = useState<number | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [pendingSale, setPendingSale] = useState<CheckoutSale | null>(null);
  const [completedPayment, setCompletedPayment] = useState<CompletedPayment | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<OfflineSaleQueueStatus | null>(null);
  const [syncingOfflineSales, setSyncingOfflineSales] = useState(false);
  const catalogSourceRef = useRef(catalogSource);
  catalogSourceRef.current = catalogSource;

  const refreshOfflineQueue = useCallback(async () => {
    if (!scope || !session.user) {
      setOfflineQueue(null);
      return;
    }
    const offlineScope: OfflineScope = {
      userId: session.user.id, businessId: scope.businessId, branchId: scope.branchId,
    };
    try {
      setOfflineQueue(await getOfflineSaleQueueStatus(offlineScope));
    } catch {
      // A failed read is unknown, not proof that all sales are synced.
      setOfflineQueue(null);
    }
  }, [scope?.businessId, scope?.branchId, session.user?.id]);

  const refreshCatalog = useCallback(async () => {
    const selected = scope;
    const account = session.user;
    if (!selected || !account) {
      setCatalog([]);
      setCatalogSource('none');
      setCatalogSavedAt(null);
      setCatalogError(null);
      setLoadingCatalog(false);
      return;
    }
    const offlineScope: OfflineScope = {
      userId: account.id, businessId: selected.businessId, branchId: selected.branchId,
    };
    setLoadingCatalog(true);
    setCatalogError(null);

    const loadCached = async () => {
      const cached = await loadOfflineCatalogue(offlineScope);
      if (cached.savedAt === null) {
        setCatalog([]);
        setCatalogSource('none');
        setCatalogSavedAt(null);
        setCatalogError('No saved products for this branch. Connect once to download stock before selling offline.');
        return;
      }
      setCatalog(cached.products.map(item => ({
        ...item, price: Number(item.price), icon: '▣', lowStockThreshold: 0,
      })));
      setCatalogSource('cached');
      setCatalogSavedAt(cached.savedAt);
      setCatalogError(null);
    };

    try {
      if (disconnected) {
        await loadCached();
        return;
      }
      const raw = await session.request<CatalogItem[]>(
        'sales/catalog?businessId=' + encodeURIComponent(selected.businessId) +
        '&branchId=' + encodeURIComponent(selected.branchId)
      );
      if (!Array.isArray(raw)) throw new Error('The product catalogue response was invalid.');
      // Persist the authoritative product catalogue whenever internet is available.
      // A cache failure must not turn an online checkout into an offline sale.
      let reservedStock: Map<string, number> | null = null;
      try {
        await cacheOfflineCatalog(offlineScope, raw);
        const cached = await loadOfflineCatalogue(offlineScope);
        setCatalogSavedAt(cached.savedAt);
        // Cash already received offline must reserve local inventory until
        // accepted or reconciled by the backend; do not oversell it online.
        reservedStock = new Map(cached.products.map(item => [item.id, item.stock]));
      } catch {
        setCatalogSavedAt(null);
      }
      setCatalog(raw.map(item => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        stock: reservedStock?.get(item.id) ?? item.stock,
        category: item.category,
        icon: '▣',
        sku: item.sku,
        barcode: item.barcode,
        lowStockThreshold: item.lowStockThreshold,
      })).filter(item => Number.isFinite(item.price) && item.price >= 0));
      setCatalogSource('live');
    } catch (error) {
      try {
        await loadCached();
      } catch {
        setCatalog([]);
        setCatalogSource('none');
        setCatalogSavedAt(null);
        setCatalogError(error instanceof Error ? error.message : 'Could not download or open saved products.');
      }
    } finally {
      setLoadingCatalog(false);
      await refreshOfflineQueue();
    }
  }, [scope?.businessId, scope?.branchId, session.user?.id, session.request, disconnected, refreshOfflineQueue]);

  const offlineMode = disconnected || catalogSource === 'cached';

  useEffect(() => {
    setLines([]);
    setPendingSale(null);
    setCompletedPayment(null);
    setCatalog([]);
    setCatalogSource('none');
    setCatalogSavedAt(null);
    setOfflineQueue(null);
    setBranch(scope?.branchName ?? 'Main Branch');
    setCustomerName('');
    setDiscountInputState('');
    setDiscountTypeState('fixed');
  }, [scope?.businessId, scope?.branchId]);

  useEffect(() => { void refreshCatalog(); }, [refreshCatalog]);
  useEffect(() => { void refreshOfflineQueue(); }, [refreshOfflineQueue]);

  // Retry cash sales on reconnect, when the app resumes and while in the
  // foreground. Keep server-rejected records for owner reconciliation.
  useEffect(() => {
    if (!scope || !session.user || disconnected) {
      setSyncingOfflineSales(false);
      return;
    }
    let active = true;
    let syncing = false;
    const offlineScope: OfflineScope = {
      userId: session.user.id, businessId: scope.businessId, branchId: scope.branchId,
    };
    const attemptSync = async () => {
      if (!active || syncing) return;
      syncing = true;
      if (active) setSyncingOfflineSales(true);
      try {
        const result = await syncOfflineCash(offlineScope, session.request);
        if (active) {
          await refreshOfflineQueue();
          // Network signal alone does not prove the KASSA API is reachable.
          // Retry catalogue loading while cached so checkout automatically
          // returns to live mode after the backend is restored.
          if (result.synced > 0 || catalogSourceRef.current === 'cached') {
            await refreshCatalog();
          }
        }
      } catch {
        // Connectivity interruptions never discard locally recorded sales.
      } finally {
        syncing = false;
        if (active) setSyncingOfflineSales(false);
      }
    };
    void attemptSync();
    const timer = setInterval(() => { void attemptSync(); }, 60000);
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void attemptSync();
    });
    return () => { active = false; clearInterval(timer); listener.remove(); };
  }, [scope?.businessId, scope?.branchId, session.user?.id, disconnected, session.request, refreshCatalog, refreshOfflineQueue]);

  const add = (id: string) => {
    const product = catalog.find(p => p.id === id);
    if (!product || pendingSale) return;
    setLines(prev => {
      const quantity = prev.find(line => line.id === id)?.quantity ?? 0;
      if (quantity >= product.stock) return prev;
      return quantity === 0
        ? [...prev, { id, quantity: 1 }]
        : prev.map(line => line.id === id ? { ...line, quantity: line.quantity + 1 } : line);
    });
  };
  const subtract = (id: string) => {
    if (pendingSale) return;
    setLines(prev => prev.map(line => line.id === id
      ? { ...line, quantity: line.quantity - 1 } : line).filter(line => line.quantity > 0));
  };
  const remove = (id: string) => {
    if (pendingSale) return;
    setLines(prev => prev.filter(line => line.id !== id));
  };
  const clear = () => {
    if (pendingSale) return;
    setLines([]);
    setDiscountInputState('');
  };
  const beginNewSale = () => {
    setLines([]);
    setPendingSale(null);
    setCompletedPayment(null);
    setPaymentMethod('Cash');
    setCustomerName('');
    setDiscountInputState('');
    setDiscountTypeState('fixed');
  };

  const subtotal = useMemo(() => {
    const totalKobo = lines.reduce((sum, line) => {
      const product = catalog.find(item => item.id === line.id);
      return sum + toKobo(product?.price ?? 0) * line.quantity;
    }, 0);
    return totalKobo / 100;
  }, [lines, catalog]);
  const subtotalKobo = toKobo(subtotal);
  const raw = discountInput.trim();
  const numericValid = raw === '' || /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(raw);
  const value = numericValid && raw ? toKobo(Number(raw)) : 0;
  const discountKobo = discountType === 'percent' && Number.isSafeInteger(subtotalKobo) &&
      Number.isSafeInteger(value) && value <= 10000
    ? Number((BigInt(subtotalKobo) * BigInt(value) + 5000n) / 10000n)
    : value;
  const discountValid = !!pendingSale || (numericValid && Number.isSafeInteger(subtotalKobo) && Number.isSafeInteger(discountKobo) &&
    (discountType !== 'percent' || value <= 10000) &&
    (discountKobo === 0 || (discountKobo > 0 && discountKobo < subtotalKobo)));
  const discount = pendingSale ? Number(pendingSale.discount ?? 0) : discountValid ? discountKobo / 100 : 0;
  const total = pendingSale ? Number(pendingSale.total) : (subtotalKobo - toKobo(discount)) / 100;
  const setDiscountType = (value: 'fixed' | 'percent') => {
    if (pendingSale) return;
    setDiscountTypeState(value); setDiscountInputState('');
  };
  const setDiscountInput = (value: string) => { if (!pendingSale) setDiscountInputState(value); };
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  return <DemoContext.Provider value={{
    lines, branch, paymentMethod, customerName, subtotal: pendingSale ? Number(pendingSale.subtotal) : subtotal, discount, discountValid, discountType, discountInput, setDiscountType, setDiscountInput, total, count, catalog, catalogSource, catalogSavedAt, offlineMode, offlineQueue, syncingOfflineSales, loadingCatalog, catalogError,
    pendingSale, completedPayment, add, subtract, remove, clear, beginNewSale, refreshCatalog, refreshOfflineQueue,
    setBranch, setPaymentMethod, setCustomerName, setPendingSale, setCompletedPayment,
  }}>{children}</DemoContext.Provider>;
}

export function useKassaDemo() {
  const store = useContext(DemoContext);
  if (!store) throw new Error('Kassa demo screens must be inside KassaDemoProvider');
  return store;
}
