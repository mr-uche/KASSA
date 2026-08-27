"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";

export default function PaymentSuccessfulPage() {
  const router = useRouter();
  const params = useSearchParams();
  const total = Number(params.get("total") ?? 24500);
  const method = params.get("method") ?? "Transfer";

  const methodLabel: Record<string, string> = {
    Transfer: "Bank Transfer",
    POS: "POS",
    Cash: "Cash",
    "USSD / Card": "USSD / Card",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar />

      <main className="ml-[198px] p-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-semibold text-gray-900">Payment Successful</h1>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700">
            Main branch
          </button>
        </div>
        <p className="text-gray-500 mb-8">
          Payment confirmed successfully. Your sale has been completed.
        </p>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-3 mb-10 max-w-md mx-auto">
          {["Sale", "Payment", "Receipt"].map((step, i) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold bg-emerald-700 text-white">
                  <Check size={14} />
                </div>
                <span className="text-xs font-medium text-gray-700">{step}</span>
              </div>
              {i < 2 && <div className="flex-1 h-0.5 mx-2 -mt-5 bg-emerald-700" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 max-w-4xl">
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center mb-6">
              <Check size={32} className="text-white" strokeWidth={3} />
            </div>

            <h2 className="text-lg font-semibold text-gray-900 mb-1">Payment successful</h2>
            <p className="text-sm text-gray-500 mb-6">
              The payment has been verified and the sale is complete.
            </p>

            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Amount paid</p>
            <p className="text-3xl font-bold text-gray-900 mb-5">
              ₦{total.toLocaleString()}.00
            </p>

            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-100 mb-6">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center">
                N
              </span>
              <div className="text-left">
                <p className="text-sm font-medium text-emerald-800">
                  {methodLabel[method] ?? method}
                </p>
                <p className="text-xs text-emerald-600">
                  Payment verified · Transaction complete
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push(`/sales/receipt?total=${total}&method=${method}`)}
              className="bg-emerald-800 hover:bg-emerald-900 text-white px-8 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              View Receipt
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Sale status</h3>

            <div className="space-y-4 mb-6">
              {["Sale confirmed", "Payment successful", "Receipt ready"].map((label, i) => (
                <div key={label} className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      i < 2 ? "bg-emerald-600" : "bg-amber-500"
                    }`}
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Customer</p>
                <p className="text-sm font-semibold text-gray-900">Walk-in customer</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Transaction</p>
                <p className="text-sm font-semibold text-emerald-700">Payment verified</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Amount</p>
                <p className="text-sm font-semibold text-gray-900">₦{total.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}