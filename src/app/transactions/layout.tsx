import type { ReactNode } from "react";
import KassaAccessGate from "@/components/KassaAccessGate";

export default function TransactionsAccessLayout({ children }: { children: ReactNode }) {
  return (
    <KassaAccessGate permission="Manage sales & transactions" title="Transactions">
      {children}
    </KassaAccessGate>
  );
}
