import type { ReactNode } from "react";
import KassaAccessGate from "@/components/KassaAccessGate";

export default function SalesAccessLayout({ children }: { children: ReactNode }) {
  return (
    <KassaAccessGate permission="Manage sales & transactions" title="Sales">
      {children}
    </KassaAccessGate>
  );
}
