"use client";

import { useEffect, useState } from "react";
import { Download, Printer, ReceiptText } from "lucide-react";
import { formatNaira } from "@/lib/inventory-client";
import type { SavedSale } from "@/lib/sales-client";
import { downloadSaleReceiptPdf } from "@/lib/receipt-pdf";

type Membership = {
  id: string;
  name: string;
  branches: { id: string; name: string }[];
};

export default function SaleReceipt({ sale }: { sale: SavedSale }) {
  const [merchant, setMerchant] = useState({ businessName: "Kassa merchant", branchName: "" });
  const successful = sale.payments.find((payment) => payment.status === "SUCCEEDED");
  const paid = sale.status === "PAID" && Boolean(successful);
  const testPayment = successful?.provider === "PAYSTACK_TEST";

  useEffect(() => {
    if (!paid) return;
    const controller = new AbortController();
    fetch("/api/businesses/mine", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to fetch merchant details");
        return (await response.json()) as Membership[];
      })
      .then((businesses) => {
        if (controller.signal.aborted) return;
        const business = businesses.find((item) => item.id === sale.businessId);
        if (!business) return;
        setMerchant({
          businessName: business.name,
          branchName: business.branches.find((branch) => branch.id === sale.branchId)?.name ?? "",
        });
      })
      .catch(() => {
        // The receipt remains available with a safe fallback heading.
      });
    return () => controller.abort();
  }, [paid, sale.businessId, sale.branchId]);

  // Never present a receipt for a payment that has not been fulfilled and saved as PAID.
  if (!paid || !successful) return null;

  const confirmedAt = new Date(successful.confirmedAt ?? sale.createdAt).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <section aria-label="Receipt preview" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <ReceiptText size={20} className="text-emerald-800" />
        <h2 className="text-lg font-semibold text-[#182033]">Receipt</h2>
        <span className="text-sm text-gray-500">Preview of this confirmed sale</span>
      </div>

      <div id="kassa-receipt-document"
        className="rounded-xl border border-gray-200 bg-white p-5 text-gray-900 sm:p-8 print:rounded-none print:border-0 print:p-0">
        <div className="mb-6 border-b border-gray-100 pb-6 text-center">
          <h3 className="text-xl font-bold">{merchant.businessName}</h3>
          {merchant.branchName && (
            <p className="mt-1 text-sm text-gray-500">{merchant.branchName}</p>
          )}
          <p className="mt-3 text-sm font-semibold text-emerald-700">
            {testPayment ? "PAYSTACK TEST RECEIPT" : "PAYMENT RECEIPT"}
          </p>
          {testPayment && (
            <div className="mt-4 rounded-lg border-2 border-amber-500 bg-amber-50 p-3 text-sm font-bold uppercase tracking-wide text-amber-900">
              TEST TRANSACTION — NO REAL MONEY RECEIVED
              <p className="mt-1 text-xs font-medium normal-case tracking-normal">
                For integration testing only. Not valid proof of payment or settlement.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-gray-100 pb-5 text-sm">
          <span className="text-gray-500">Receipt reference</span>
          <span className="break-all text-right font-medium">{sale.reference}</span>
          <span className="text-gray-500">Payment confirmed</span>
          <span className="text-right font-medium">{confirmedAt}</span>
          <span className="text-gray-500">Served by</span>
          <span className="text-right font-medium">{sale.cashier}</span>
          <span className="text-gray-500">Customer</span>
          <span className="break-words text-right font-medium">{sale.customer}</span>
          <span className="text-gray-500">Payment method</span>
          <span className="text-right font-medium">{successful.channel.replaceAll("_", " ")}</span>
          {testPayment && successful.providerReference && (
            <>
              <span className="text-gray-500">Paystack test reference</span>
              <span className="break-all text-right font-medium">{successful.providerReference}</span>
            </>
          )}
        </div>

        <div className="mt-5 w-full overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[320px] text-sm print:min-w-0">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                <th scope="col" className="py-3 pr-2">Item</th>
                <th scope="col" className="px-2 py-3 text-center">Qty</th>
                <th scope="col" className="py-3 pl-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="break-words py-3 pr-2">{item.name}</td>
                  <td className="px-2 py-3 text-center">{item.quantity}</td>
                  <td className="whitespace-nowrap py-3 pl-2 text-right">{formatNaira(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatNaira(sale.subtotal)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Discount</span>
            <span>{formatNaira(sale.discount)}</span>
          </div>
          <div className="flex justify-between gap-4 pt-2 text-lg font-bold">
            <span>Total paid</span>
            <span className="text-emerald-700">{formatNaira(sale.total)}</span>
          </div>
        </div>
        <p className="mt-7 text-center text-xs text-gray-500">
          {testPayment ? "TEST RECEIPT ONLY — DO NOT RELEASE REAL GOODS." : "Thank you for your purchase."}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 print:hidden">
        <button type="button"
          onClick={() => downloadSaleReceiptPdf(sale, merchant.businessName, merchant.branchName)}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900">
          <Download size={17} /> Download PDF
        </button>
        <button type="button" onClick={() => window.print()}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-emerald-800 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50">
          <Printer size={17} /> Print receipt
        </button>
      </div>
    </section>
  );
}
