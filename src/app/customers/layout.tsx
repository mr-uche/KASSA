import type { ReactNode } from "react";
import KassaAccessGate from "@/components/KassaAccessGate";

export default function CustomersAccessLayout({ children }: { children: ReactNode }) {
  return (
    <KassaAccessGate permission="Manage customers" title="Customers">
      {children}
    </KassaAccessGate>
  );
}
