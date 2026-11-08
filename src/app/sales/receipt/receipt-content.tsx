"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Menu, Printer } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import { getSale, type SavedSale } from "@/lib/sales-client";
import { formatNaira } from "@/lib/inventory-client";

type Membership = { id: string; name: string; branches: { id: string; name: string }[] };

export default function ReceiptContent() {
  const id = useSearchParams().get("saleId") ?? "";
  const [sale, setSale] = useState<SavedSale | null>(null);
  const [businessName, setBusinessName] = useState("Kassa merchant");
  const [branchName, setBranchName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id) { setError("A completed sale is required to view its receipt."); setLoading(false); return; }
    Promise.all([
      getSale(id),
      fetch("/api/businesses/mine", { cache: "no-store" }).then(async (response) =>
        response.ok ? (await response.json()) as Membership[] : []),
    ]).then(([saved, businesses]) => {
      if (!active) return;
      setSale(saved);
      const merchant = businesses.find((business) => business.id === saved.businessId);
      if (merchant) {
        setBusinessName(merchant.name);
        setBranchName(merchant.branches.find((branch) => branch.id === saved.branchId)?.name ?? "");
      }
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Unable to load receipt.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const paid = sale?.status === "PAID" && sale.payments.some((payment) => payment.status === "SUCCEEDED");
  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-h-screen lg:ml-[198px]">
        <header className="flex h-20 items-center gap-3 border-b border-[#E5E7EB] bg-white px-4 sm:px-8 print:hidden">
          <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open menu"
            className="rounded-md p-2 lg:hidden"><Menu size={21} /></button>
          <h1 className="text-xl font-bold text-[#182033]">Receipt</h1>
        </header>
        <div className="mx-auto max-w-3xl px-4 py-8">
          {loading && <p className="text-sm text-gray-500">Loading verified receipt...</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {!loading && sale && !paid && (
            <div className="rounded-xl border border-gray-200 bg-white p-7 text-center">
              <h2 className="font-semibold text-gray-900">Receipt not available</h2>
              <p className="mt-2 text-sm text-gray-500">Payment has not been confirmed for this sale.</p>
              <Link href={"/sales/payment?saleId=" + encodeURIComponent(sale.id)}
                className="mt-4 inline-block text-sm font-medium text-emerald-700">View payment status</Link>
            </div>
          )}
          {paid && sale && (
            <>
              <section className="rounded-xl border border-gray-200 bg-white p-6 sm:p-10 print:border-0">
                <div className="mb-6 border-b border-gray-100 pb-6 text-center">
                  <h2 className="text-xl font-bold text-gray-900">{businessName}</h2>
                  {branchName && <p className="mt-1 text-sm text-gray-500">{branchName}</p>}
                  <p className="mt-3 text-sm font-medium text-emerald-700">PAYMENT RECEIPT</p>
                </div>
                <div className="grid grid-cols-2 gap-3 border-b border-gray-100 pb-5 text-sm">
                  <span className="text-gray-500">Receipt reference</span><span className="break-all text-right font-medium">{sale.reference}</span>
                  <span className="text-gray-500">Payment confirmed</span><span className="text-right font-medium">
                    {new Date(sale.payments.find((p) => p.status === "SUCCEEDED")?.confirmedAt ?? sale.createdAt).toLocaleString("en-NG")}
                  </span>
                  <span className="text-gray-500">Served by</span><span className="text-right font-medium">{sale.cashier}</span>
                  <span className="text-gray-500">Customer</span><span className="text-right font-medium">{sale.customer}</span>
                  <span className="text-gray-500">Payment method</span><span className="text-right font-medium">
                    {sale.payments[0]?.channel.replaceAll("_", " ") ?? "Unknown"}
                  </span>
                </div>
                <table className="mt-5 w-full text-sm">
                  <thead><tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                    <th className="py-3">Item</th><th className="py-3 text-center">Qty</th><th className="py-3 text-right">Amount</th>
                  </tr></thead>
                  <tbody>{sale.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="py-3 text-gray-900">{item.name}</td>
                      <td className="py-3 text-center">{item.quantity}</td>
                      <td className="py-3 text-right">{formatNaira(item.lineTotal)}</td>
                    </tr>
                  ))}</tbody>
                </table>
                <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatNaira(sale.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>{formatNaira(sale.discount)}</span></div>
                  <div className="flex justify-between pt-2 text-lg font-bold"><span>Total paid</span><span className="text-emerald-700">{formatNaira(sale.total)}</span></div>
                </div>
              </section>
              <div className="mt-5 flex flex-wrap gap-3 print:hidden">
                <button type="button" onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-medium text-white">
                  <Printer size={17} /> Print receipt
                </button>
                <Link href="/sales/new" className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium">New sale</Link>
                <Link href="/transactions" className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium">Transactions</Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
