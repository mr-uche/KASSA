import type { ReactNode } from "react";
import KassaAccessGate from "@/components/KassaAccessGate";

export default function ProductsAccessLayout({ children }: { children: ReactNode }) {
  return (
    <KassaAccessGate permission="Manage products & inventory" title="Products & Inventory">
      {children}
    </KassaAccessGate>
  );
}
