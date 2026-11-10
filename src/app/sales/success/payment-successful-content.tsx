"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock3, Menu } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import { getSale, type SavedSale } from "@/lib/sales-client";
import { formatNaira } from "@/lib/inventory-client";

export default function PaymentSuccessfulContent() {
  const params = useSearchParams();
  const id = params.get("saleId") ?? "";
  const [sale, setSale] = useState<SavedSale | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id) { setError("No verified sale selected."); setLoading(false); return; }
    getSale(id).then((saved) => {
      if (active) { setSale(saved); setError(""); }
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Unable to load sale.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const paid = sale?.status === "PAID" && sale.payments.some((p) => p.status === "SUCCEEDED");
  const testPayment = sale?.payments.some((payment) => payment.provider === "PAYSTACK_TEST") ?? false;
  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-h-screen lg:ml-[198px]">
        <header className="flex min-h-[80px] items-center gap-3 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 lg:px-8">
          <button type="button" aria-label="Open menu" onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 lg:hidden"><Menu size={21} /></button>
          <h1 className="text-xl font-bold text-[#182033]">Sale status</h1>
        </header>
        <div className="mx-auto max-w-2xl px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10 lg:pt-12">
          <section className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            {loading && <p className="text-sm text-gray-500">Checking payment status...</p>}
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            {sale && (
              <>
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                  {paid ? <CheckCircle2 size={34} className="text-emerald-700" /> : <Clock3 size={34} className="text-amber-600" />}
                </div>
                {testPayment && (
                  <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                    PAYSTACK TEST TRANSACTION — No real money received.
                  </p>
                )}
                <h2 className="text-xl font-semibold text-gray-900">{paid ? "Payment confirmed" : "Payment not yet verified"}</h2>
                <p className="mt-3 text-sm text-gray-500">
                  {paid
                    ? "The sale is recorded as paid, and its inventory movement has been saved."
                    : "This sale is still pending. A receipt is available only after confirmed payment."}
                </p>
                <p className="mt-5 text-2xl font-bold text-emerald-700">{formatNaira(sale.total)}</p>
                <p className="mt-2 break-all text-xs text-gray-500">Sale reference: {sale.reference}</p>
                {paid && (
                  <Link href={"/sales/receipt?saleId=" + encodeURIComponent(sale.id)}
                    className="mt-6 flex items-center justify-center rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white">
                    {testPayment ? "View TEST receipt" : "View receipt"}
                  </Link>
                )}
                {!paid && (
                  <Link href={"/sales/payment?saleId=" + encodeURIComponent(sale.id)}
                    className="mt-6 flex items-center justify-center rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white">
                    View pending payment
                  </Link>
                )}
              </>
            )}
            <Link href="/transactions" className="mt-5 inline-flex text-sm font-medium text-emerald-700">Transaction history</Link>
          </section>
        </div>
      </main>
    </div>
  );
}
