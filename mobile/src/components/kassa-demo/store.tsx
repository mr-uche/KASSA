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
  const user = session.user;
  const request = session.request;
  const scopeKey = JSON.stringify([user?.id, scope?.businessId, scope?.branchId]);
  const [previousScopeKey, setPreviousScopeKey] = useState(scopeKey);
  const { disconnected } = useKassaConnectivity();
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [branch, setBranch] = useState(scope?.branchName ?? 'Main Branch');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customerName, setCustomerName] = useState('');
  const [discountType, setDiscountTypeState] = useState<'fixed' | 'percent'>('fixed');
  const [discountInput, setDiscountInputState] = useState('');
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogSource, setCatalogSource] = useState<'live' | 'cached' | 'none'>('none');
  const [catalogSavedAt, setCatalogSavedAt] = useState<number | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(!!scope && !!user);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [pendingSale, setPendingSale] = useState<CheckoutSale | null>(null);
  const [completedPayment, setCompletedPayment] = useState<CompletedPayment | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<OfflineSaleQueueStatus | null>(null);
  const [syncingState, setSyncingOfflineSales] = useState(false);
  const syncingOfflineSales = !disconnected && syncingState;
  const catalogSourceRef = useRef(catalogSource);
  const activeScopeRef = useRef<string | null>(scopeKey);
  const catalogVersion = useRef(0);
  const queueVersion = useRef(0);
  useEffect(() => {
    catalogSourceRef.current = catalogSource;
  }, [catalogSource]);
  useEffect(() => {
    activeScopeRef.current = scopeKey;
    return () => { activeScopeRef.current = null; };
  }, [scopeKey]);

  // Reset only the volatile checkout state when the cashier or branch changes.
  // Do not remount navigation or delete the durable offline queue.
  if (previousScopeKey !== scopeKey) {
    setPreviousScopeKey(scopeKey);
    setLines([]);
    setPendingSale(null);
    setCompletedPayment(null);
    setCatalog([]);
    setCatalogSource('none');
    setCatalogSavedAt(null);
    setCatalogError(null);
    setLoadingCatalog(!!scope && !!user);
    setOfflineQueue(null);
    setSyncingOfflineSales(false);
    setBranch(scope?.branchName ?? 'Main Branch');
    setCustomerName('');
    setDiscountInputState('');
    setDiscountTypeState('fixed');
  }

  const refreshOfflineQueue = useCallback(async (isCurrent: () => boolean = () => true) => {
    if (!scope || !user) return;
    const version = ++queueVersion.current;
    const current = () => isCurrent() && activeScopeRef.current === scopeKey && queueVersion.current === version;
    const offlineScope: OfflineScope = {
      userId: user.id, businessId: scope.businessId, branchId: scope.branchId,
    };
    try {
      const result = await getOfflineSaleQueueStatus(offlineScope);
      if (current()) setOfflineQueue(result);
    } catch {
      // A failed read is unknown, not proof that all sales are synced.
      if (current()) setOfflineQueue(null);
    }
  }, [scope, user, scopeKey]);

  const loadCatalog = useCallback(async (isCurrent: () => boolean = () => true) => {
    if (!scope || !user) return;
    const version = ++catalogVersion.current;
    const current = () => isCurrent() && activeScopeRef.current === scopeKey && catalogVersion.current === version;
    const offlineScope: OfflineScope = {
      userId: user.id, businessId: scope.businessId, branchId: scope.branchId,
    };
    const loadCached = async () => {
      const cached = await loadOfflineCatalogue(offlineScope);
      if (!current()) return;
      if (cached.savedAt === null) {
        setCatalog([]);
        setCatalogSource('none');
        setCatalogSavedAt(null);
        setCatalogError('No saved stock. Connect to download products.');
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
      const raw = await request<CatalogItem[]>(
        'sales/catalog?businessId=' + encodeURIComponent(scope.businessId) +
        '&branchId=' + encodeURIComponent(scope.branchId)
      );
      if (!current()) return;
      if (!Array.isArray(raw)) throw new Error('The product catalogue response was invalid.');
      // Keep the authoritative catalogue and reserve stock already sold offline.
      let reservedStock: Map<string, number> | null = null;
      try {
        await cacheOfflineCatalog(offlineScope, raw);
        const cached = await loadOfflineCatalogue(offlineScope);
        if (!current()) return;
        setCatalogSavedAt(cached.savedAt);
        reservedStock = new Map(cached.products.map(item => [item.id, item.stock]));
      } catch {
        if (!current()) return;
        setCatalogSavedAt(null);
      }
      setCatalog(raw.map(item => ({
        id: item.id, name: item.name, price: Number(item.price),
        stock: reservedStock?.get(item.id) ?? item.stock,
        category: item.category, icon: '▣', sku: item.sku,
        barcode: item.barcode, lowStockThreshold: item.lowStockThreshold,
      })).filter(item => Number.isFinite(item.price) && item.price >= 0));
      setCatalogSource('live');
      setCatalogError(null);
    } catch (error) {
      if (!current()) return;
      try {
        await loadCached();
      } catch {
        if (!current()) return;
        setCatalog([]);
        setCatalogSource('none');
        setCatalogSavedAt(null);
        setCatalogError(error instanceof Error ? error.message : 'Could not download or open saved products.');
      }
    } finally {
      if (current()) {
        setLoadingCatalog(false);
        await refreshOfflineQueue(current);
      }
    }
  }, [scope, user, scopeKey, request, disconnected, refreshOfflineQueue]);

  const refreshCatalog = useCallback(async () => {
    if (!scope || !user || activeScopeRef.current !== scopeKey) return;
    setLoadingCatalog(true);
    setCatalogError(null);
    await loadCatalog();
  }, [scope, user, scopeKey, loadCatalog]);

  const offlineMode = disconnected || catalogSource === 'cached';

  useEffect(() => {
    let active = true;
    void loadCatalog(() => active);
    return () => { active = false; };
  }, [loadCatalog]);
  useEffect(() => {
    let active = true;
    void refreshOfflineQueue(() => active);
    return () => { active = false; };
  }, [refreshOfflineQueue]);

  // Retry on reconnect, resume and while foregrounded. Never discard rejected records.
  useEffect(() => {
    if (!scope || !user || disconnected) return;
    let active = true;
    let syncing = false;
    const offlineScope: OfflineScope = {
      userId: user.id, businessId: scope.businessId, branchId: scope.branchId,
    };
    const current = () => active && activeScopeRef.current === scopeKey;
    const attemptSync = async () => {
      if (!current() || syncing) return;
      syncing = true;
      try {
        // Read the durable queue before initiating the network synchronization.
        await refreshOfflineQueue(current);
        if (!current()) return;
        setSyncingOfflineSales(true);
        const result = await syncOfflineCash(offlineScope, request);
        if (current()) {
          await refreshOfflineQueue(current);
          if (current() && (result.synced > 0 || catalogSourceRef.current === 'cached')) {
            await loadCatalog(current);
          }
        }
      } catch {
        // Connectivity interruptions never discard locally recorded sales.
      } finally {
        syncing = false;
        if (current()) setSyncingOfflineSales(false);
      }
    };
    void attemptSync();
    const timer = setInterval(() => { void attemptSync(); }, 60000);
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void attemptSync();
    });
    return () => { active = false; clearInterval(timer); listener.remove(); };
  }, [scope, user, scopeKey, disconnected, request, loadCatalog, refreshOfflineQueue]);

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
