import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { type Product } from './data';
import { useKassaSession, type CatalogItem, type CheckoutSale } from './api';

export type SaleLine = { id: string; quantity: number };
export type CompletedPayment = { sale: CheckoutSale; cashReceived: number | null; change: number };
type DemoStore = {
  lines: SaleLine[];
  branch: string;
  paymentMethod: string;
  total: number;
  count: number;
  catalog: Product[];
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
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [branch, setBranch] = useState('Main Branch');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [pendingSale, setPendingSale] = useState<CheckoutSale | null>(null);
  const [completedPayment, setCompletedPayment] = useState<CompletedPayment | null>(null);

  const refreshCatalog = useCallback(async () => {
    if (!scope) {
      setCatalog([]);
      setCatalogError(null);
      setLoadingCatalog(false);
      return;
    }
    setLoadingCatalog(true);
    setCatalog([]);
    setCatalogError(null);
    try {
      const raw = await session.request<CatalogItem[]>(
        'sales/catalog?businessId=' + encodeURIComponent(scope.businessId) +
        '&branchId=' + encodeURIComponent(scope.branchId)
      );
      if (!Array.isArray(raw)) throw new Error('The product catalogue response was invalid.');
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
    } catch (error) {
      setCatalog([]);
      setCatalogError(error instanceof Error ? error.message : 'Unable to load products.');
    } finally {
      setLoadingCatalog(false);
    }
  }, [scope?.businessId, scope?.branchId, session.request]);

  useEffect(() => {
    setLines([]);
    setPendingSale(null);
    setCompletedPayment(null);
    setBranch(scope?.branchName ?? 'Main Branch');
  }, [scope?.businessId, scope?.branchId]);

  useEffect(() => { void refreshCatalog(); }, [refreshCatalog]);

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

  const total = useMemo(() => lines.reduce((sum, line) => {
    const product = catalog.find(item => item.id === line.id);
    return sum + (product?.price ?? 0) * line.quantity;
  }, 0), [lines, catalog]);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  return <DemoContext.Provider value={{
    lines, branch, paymentMethod, total, count, catalog, loadingCatalog, catalogError,
    pendingSale, completedPayment, add, subtract, remove, clear, beginNewSale, refreshCatalog,
    setBranch, setPaymentMethod, setPendingSale, setCompletedPayment,
  }}>{children}</DemoContext.Provider>;
}

export function useKassaDemo() {
  const store = useContext(DemoContext);
  if (!store) throw new Error('Kassa demo screens must be inside KassaDemoProvider');
  return store;
}
