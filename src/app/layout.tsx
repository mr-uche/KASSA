import type { Metadata } from "next";
import "./globals.css";
import OfflineAppBridge from "@/components/OfflineAppBridge";

export const metadata: Metadata = {
  title: "Kassa",
  description: "Kassa — banking & fintech dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}<OfflineAppBridge /></body>
    </html>
  );
}
