"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Menu } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import { formatNaira } from "@/lib/inventory-client";
import { getSale, saleStatusLabel, type SavedSale } from "@/lib/sales-client";

export default function TransactionDetailsPage() {
  const params = useParams<{ id: string }>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sale, setSale] = useState<SavedSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getSale(params.id).then((result) => {
      if (active) { setSale(result); setError(""); }
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Unable to load transaction.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id]);

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-h-screen lg:ml-[198px]">
        <header className="flex min-h-[80px] items-center gap-3 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 lg:px-8">
          <button type="button" aria-label="Open menu" onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 lg:hidden"><Menu size={21} /></button>
          <h1 className="text-xl font-bold text-[#182033]">Transaction details</h1>
        </header>
        <div className="mx-auto max-w-4xl space-y-6 px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10 lg:pt-12">
          <Link href="/transactions" className="text-sm font-medium text-emerald-700">← Back to transactions</Link>
          {loading && <p role="status" className="text-sm text-gray-500">Loading transaction...</p>}
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-white p-4 text-sm text-red-700">{error}</p>}
          {sale && (
            <>
              <section className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-500">Sale reference</p>
                    <h2 className="mt-1 break-all text-lg font-semibold text-gray-900">{sale.reference}</h2>
                    <p className="mt-1 text-xs text-gray-500">{new Date(sale.createdAt).toLocaleString("en-NG")}</p>
                  </div>
                  <span className={sale.status === "PAID"
                    ? "rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
                    : "rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700"}>
                    {saleStatusLabel(sale.status)}
                  </span>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 text-sm">
                  <span className="text-gray-500">Customer</span><span className="text-right font-medium">{sale.customer}</span>
                  <span className="text-gray-500">Cashier</span><span className="text-right font-medium">{sale.cashier}</span>
                  <span className="text-gray-500">Payment channel</span><span className="text-right font-medium">{sale.payments[0]?.channel.replaceAll("_", " ") ?? "None"}</span>
                  <span className="text-gray-500">Payment status</span><span className="text-right font-medium">{sale.payments[0]?.status ?? "None"}</span>
                  <span className="text-gray-500">Total</span><span className="text-right text-lg font-bold text-emerald-700">{formatNaira(sale.total)}</span>
                </div>
              </section>
              <section className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-base font-semibold text-gray-900">Sale items</h3>
                <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[370px] text-sm">
                  <thead><tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                    <th className="pb-3">Product</th><th className="pb-3 text-center">Quantity</th><th className="pb-3 text-right">Line total</th>
                  </tr></thead>
                  <tbody>{sale.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="py-3">{item.name}</td>
                      <td className="py-3 text-center">{item.quantity}</td>
                      <td className="py-3 text-right">{formatNaira(item.lineTotal)}</td>
                    </tr>
                  ))}</tbody>
                </table>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 font-semibold">
                  <span>Total</span><span className="text-lg text-emerald-700">{formatNaira(sale.total)}</span>
                </div>
              </section>
              {sale.status === "PAID" ? (
                <Link href={"/sales/receipt?saleId=" + encodeURIComponent(sale.id)}
                  className="inline-flex rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white">
                  View verified receipt
                </Link>
              ) : (
                <Link href={"/sales/payment?saleId=" + encodeURIComponent(sale.id)}
                  className="inline-flex rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white">
                  View payment status
                </Link>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
