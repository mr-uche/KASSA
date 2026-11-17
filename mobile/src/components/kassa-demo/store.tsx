import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { type Product } from './data';
import { useKassaSession, type CatalogItem, type CheckoutSale } from './api';
import { toKobo } from './theme';
import { cacheOfflineCatalog, loadOfflineCatalogue, syncOfflineCash, type OfflineScope } from './offline-cash';
import { useKassaConnectivity } from './connectivity';

export type SaleLine = { id: string; quantity: number };
export type CompletedPayment = { sale: CheckoutSale; cashReceived: number | null; change: number };
type DemoStore = {
  lines: SaleLine[];
  branch: string;
  paymentMethod: string;
  total: number;
  count: number;
  catalog: Product[];
  catalogSource: 'live' | 'cached' | 'none';
  catalogSavedAt: number | null;
  offlineMode: boolean;
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
  setBranch(value: string): void;
  setPaymentMethod(value: string): void;
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
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogSource, setCatalogSource] = useState<'live' | 'cached' | 'none'>('none');
  const [catalogSavedAt, setCatalogSavedAt] = useState<number | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [pendingSale, setPendingSale] = useState<CheckoutSale | null>(null);
  const [completedPayment, setCompletedPayment] = useState<CompletedPayment | null>(null);

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
      try {
        await cacheOfflineCatalog(offlineScope, raw);
        setCatalogSavedAt(Date.now());
      } catch {
        setCatalogSavedAt(null);
      }
      setCatalog(raw.map(item => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        stock: item.stock,
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
    }
  }, [scope?.businessId, scope?.branchId, session.user?.id, session.request, disconnected]);

  const offlineMode = disconnected || catalogSource === 'cached';

  useEffect(() => {
    setLines([]);
    setPendingSale(null);
    setCompletedPayment(null);
    setCatalog([]);
    setCatalogSource('none');
    setCatalogSavedAt(null);
    setBranch(scope?.branchName ?? 'Main Branch');
  }, [scope?.businessId, scope?.branchId]);

  useEffect(() => { void refreshCatalog(); }, [refreshCatalog]);

  // Retry cash sales on reconnect, when the app resumes and while in the
  // foreground. Keep server-rejected records for owner reconciliation.
  useEffect(() => {
    if (!scope || !session.user || disconnected) return;
    let active = true;
    let syncing = false;
    const offlineScope: OfflineScope = {
      userId: session.user.id, businessId: scope.businessId, branchId: scope.branchId,
    };
    const attemptSync = async () => {
      if (!active || syncing) return;
      syncing = true;
      try {
        const result = await syncOfflineCash(offlineScope, session.request);
        if (active && result.synced > 0) await refreshCatalog();
      } catch {
        // Connectivity interruptions never discard a locally recorded sale.
      } finally {
        syncing = false;
      }
    };
    void attemptSync();
    const timer = setInterval(() => { void attemptSync(); }, 60000);
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void attemptSync();
    });
    return () => { active = false; clearInterval(timer); listener.remove(); };
  }, [scope?.businessId, scope?.branchId, session.user?.id, disconnected, session.request, refreshCatalog]);

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
  };
  const beginNewSale = () => {
    setLines([]);
    setPendingSale(null);
    setCompletedPayment(null);
    setPaymentMethod('Cash');
  };

  const total = useMemo(() => {
    const totalKobo = lines.reduce((sum, line) => {
      const product = catalog.find(item => item.id === line.id);
      return sum + toKobo(product?.price ?? 0) * line.quantity;
    }, 0);
    return totalKobo / 100;
  }, [lines, catalog]);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  return <DemoContext.Provider value={{
    lines, branch, paymentMethod, total, count, catalog, catalogSource, catalogSavedAt, offlineMode, loadingCatalog, catalogError,
    pendingSale, completedPayment, add, subtract, remove, clear, beginNewSale, refreshCatalog,
    setBranch, setPaymentMethod, setPendingSale, setCompletedPayment,
  }}>{children}</DemoContext.Provider>;
}

export function useKassaDemo() {
  const store = useContext(DemoContext);
  if (!store) throw new Error('Kassa demo screens must be inside KassaDemoProvider');
  return store;
}
