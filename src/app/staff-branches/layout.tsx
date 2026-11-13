import type { ReactNode } from "react";
import KassaAccessGate from "@/components/KassaAccessGate";

export default function StaffbranchesAccessLayout({ children }: { children: ReactNode }) {
  return (
    <KassaAccessGate permission="Owner" title="Staff & Branches">
      {children}
    </KassaAccessGate>
  );
}
