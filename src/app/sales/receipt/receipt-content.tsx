"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Menu } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import SaleReceipt from "@/components/sales/SaleReceipt";
import { getSale, type SavedSale } from "@/lib/sales-client";

export default function ReceiptContent() {
  const id = useSearchParams().get("saleId") ?? "";
  const [sale, setSale] = useState<SavedSale | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id) {
      setError("A completed sale is required to view its receipt.");
      setLoading(false);
      return;
    }
    getSale(id).then((record) => {
      if (active) { setSale(record); setError(""); }
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Unable to load receipt.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const paid = sale?.status === "PAID" && sale.payments.some((p) => p.status === "SUCCEEDED");

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-h-screen lg:ml-[198px]">
        <header className="flex min-h-[80px] items-center gap-3 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 lg:px-8 print:hidden">
          <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open menu"
            className="rounded-md p-2 lg:hidden"><Menu size={21} /></button>
          <h1 className="text-xl font-bold text-[#182033]">Receipt</h1>
        </header>
        <div className="mx-auto max-w-3xl space-y-5 px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10 lg:pt-12 print:p-0">
          {loading && <p className="text-sm text-gray-500">Loading verified receipt...</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {!loading && sale && !paid && (
            <section className="rounded-xl border border-gray-200 bg-white p-7 text-center">
              <h2 className="font-semibold text-gray-900">Receipt not available</h2>
              <p className="mt-2 text-sm text-gray-500">Payment has not been confirmed for this sale.</p>
              <Link href={"/sales/payment?saleId=" + encodeURIComponent(sale.id)}
                className="mt-4 inline-block text-sm font-medium text-emerald-700">View payment status</Link>
            </section>
          )}
          {sale && paid && <SaleReceipt sale={sale} />}
          <div className="flex flex-wrap gap-3 print:hidden">
            <Link href="/sales/new" className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium">New sale</Link>
            <Link href="/transactions" className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium">Transactions</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
