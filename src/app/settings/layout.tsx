import type { ReactNode } from "react";
import KassaAccessGate from "@/components/KassaAccessGate";

export default function SettingsAccessLayout({ children }: { children: ReactNode }) {
  return (
    <KassaAccessGate permission="Owner" title="Settings">
      {children}
    </KassaAccessGate>
  );
}
