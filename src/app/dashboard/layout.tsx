import type { ReactNode } from "react";
import KassaAccessGate from "@/components/KassaAccessGate";

export default function DashboardAccessLayout({ children }: { children: ReactNode }) {
  return (
    <KassaAccessGate permission="View dashboard" title="Dashboard">
      {children}
    </KassaAccessGate>
  );
}
