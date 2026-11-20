import type { ReactNode } from "react";
import KassaAccessGate from "@/components/KassaAccessGate";

export default function SettingsAccessLayout({ children }: { children: ReactNode }) {
  return (
    <KassaAccessGate permission="Manage business settings" title="Settings">
      {children}
    </KassaAccessGate>
  );
}
