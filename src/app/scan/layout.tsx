import type { ReactNode } from "react";
import KassaAccessGate from "@/components/KassaAccessGate";

export default function ScanAccessLayout({ children }: { children: ReactNode }) {
  return (
    <KassaAccessGate permission="Manage sales & transactions" title="Scan Product">
      {children}
    </KassaAccessGate>
  );
}
