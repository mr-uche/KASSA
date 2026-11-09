"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Menu, Clock3 } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import { confirmCash, getSale, type SavedSale } from "@/lib/sales-client";
import { formatNaira } from "@/lib/inventory-client";

export default function PaymentStatusContent() {
  const router = useRouter();
  const params = useSearchParams();
  const saleId = params.get("saleId") ?? "";
  const [sale, setSale] = useState<SavedSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cashReceived, setCashReceived] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!saleId) {
      setError("No saved sale selected. Start from New Sale.");
      setLoading(false);
      return;
    }
    getSale(saleId).then((result) => {
      if (active) { setSale(result); setError(""); }
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Unable to load sale.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [saleId]);

  async function handleCashConfirmation() {
    if (!sale || sale.status !== "PENDING_PAYMENT" || sale.payments[0]?.channel !== "CASH" ||
        !cashReceived || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const confirmed = await confirmCash(sale.id);
      setSale(confirmed);
      router.replace("/sales/success?saleId=" + encodeURIComponent(confirmed.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to confirm cash receipt.");
    } finally { setSubmitting(false); }
  }

  const cash = sale?.payments[0]?.channel === "CASH";

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-h-screen lg:ml-[198px]">
        <header className="flex min-h-[80px] items-center gap-3 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 lg:hidden" aria-label="Open menu"><Menu size={21} /></button>
          <h1 className="text-xl font-bold text-[#182033]">Payment status</h1>
        </header>
        <div className="mx-auto max-w-3xl space-y-5 px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10 lg:pt-12">
          {loading && <p className="text-sm text-gray-500">Loading sale from Kassa...</p>}
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-white p-4 text-sm text-red-700">{error}</p>}
          {sale && (
            <>
              <section className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  {sale.status === "PAID"
                    ? <CheckCircle2 size={23} className="text-emerald-700" />
                    : <Clock3 size={23} className="text-amber-600" />}
                  <h2 className="text-lg font-semibold text-gray-900">
                    {sale.status === "PAID" ? "Payment confirmed" : "Awaiting payment"}
                  </h2>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {sale.status === "PAID"
                    ? "This sale has been saved as paid and the stock deduction was recorded."
                    : cash
                      ? "Record payment only after you have physically received the cash."
                      : "The sale is saved as pending. Electronic payment verification is not connected yet."}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 text-sm">
                  <span className="text-gray-500">Reference</span>
                  <span className="break-all text-right font-medium text-gray-900">{sale.reference}</span>
                  <span className="text-gray-500">Amount</span>
                  <span className="text-right text-xl font-bold text-emerald-700">{formatNaira(sale.total)}</span>
                  <span className="text-gray-500">Channel</span>
                  <span className="text-right font-medium text-gray-900">{sale.payments[0]?.channel.replaceAll("_", " ") ?? "Not selected"}</span>
                  <span className="text-gray-500">Items</span>
                  <span className="text-right font-medium text-gray-900">{sale.items.length}</span>
                </div>
              </section>
              {cash && sale.status === "PENDING_PAYMENT" && (
                <section className="rounded-xl border border-gray-200 bg-white p-6">
                  <h3 className="font-semibold text-gray-900">Confirm cash received</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Only confirm after collecting the full amount. This action records the payment and decreases stock.
                  </p>
                  <label className="mt-4 flex items-start gap-3 text-sm text-gray-700">
                    <input type="checkbox" checked={cashReceived} onChange={(e) => setCashReceived(e.target.checked)}
                      className="mt-1 accent-emerald-700" />
                    I have physically received {formatNaira(sale.total)} in cash from the customer.
                  </label>
                  <button type="button" onClick={handleCashConfirmation}
                    disabled={!cashReceived || submitting}
                    className="mt-5 w-full rounded-lg bg-emerald-800 py-3 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50">
                    {submitting ? "Recording cash payment..." : "Confirm cash received"}
                  </button>
                </section>
              )}
              {sale.status === "PAID" && (
                <Link href={"/sales/receipt?saleId=" + encodeURIComponent(sale.id)}
                  className="flex items-center justify-center rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white">
                  View verified receipt
                </Link>
              )}
            </>
          )}
          <div className="flex flex-wrap gap-3">
            <Link href="/transactions" className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700">Transaction history</Link>
            <Link href="/sales/new" className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700">New sale</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
