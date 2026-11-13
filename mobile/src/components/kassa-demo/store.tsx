import React, { createContext, useContext, useMemo, useState } from 'react';
import { products } from './data';

export type SaleLine = { id: string; quantity: number };
type DemoStore = {
  lines: SaleLine[];
  branch: string;
  paymentMethod: string;
  total: number;
  count: number;
  add(id: string): void;
  subtract(id: string): void;
  clear(): void;
  setBranch(value: string): void;
  setPaymentMethod(value: string): void;
};
const DemoContext = createContext<DemoStore | null>(null);

export function KassaDemoProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [branch, setBranch] = useState('Main Branch');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const add = (id: string) => setLines(prev => {
    const found = prev.find(line => line.id === id);
    if (!found) return [...prev, { id, quantity: 1 }];
    return prev.map(line => line.id === id ? { ...line, quantity: line.quantity + 1 } : line);
  });
  const subtract = (id: string) => setLines(prev => prev
    .map(line => line.id === id ? { ...line, quantity: line.quantity - 1 } : line)
    .filter(line => line.quantity > 0));
  const total = useMemo(() => lines.reduce((sum, line) => {
    const product = products.find(item => item.id === line.id);
    return sum + (product?.price ?? 0) * line.quantity;
  }, 0), [lines]);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  return <DemoContext.Provider value={{ lines, branch, paymentMethod, total, count, add, subtract, clear: () => setLines([]), setBranch, setPaymentMethod }}>{children}</DemoContext.Provider>;
}

export function useKassaDemo() {
  const store = useContext(DemoContext);
  if (!store) throw new Error('Kassa demo screens must be inside KassaDemoProvider');
  return store;
}
