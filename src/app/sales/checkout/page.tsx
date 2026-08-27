"use client";

import { useRouter, useSearchParams } from "next/navigation";
import KassaSidebar from "@/components/KassaSidebar";
import { Check } from "lucide-react";

type SaleItem = { name: string; price: number; qty: number };

export default function ConfirmPaymentPage() {
  const router = useRouter();
  const params = useSearchParams();

  const total = Number(params.get("total") ?? 0);
  const subtotal = Number(params.get("subtotal") ?? 0);
  const discount = Number(params.get("discount") ?? 0);
  const method = params.get("method") ?? "Transfer";
  const items: SaleItem[] = params.get("items")
    ? JSON.parse(decodeURIComponent(params.get("items")!))
    : [];

  const methodLabel: Record<string, string> = {
    Transfer: "Bank Transfer",
    POS: "POS",
    Cash: "Cash",
    "USSD / Card": "USSD / Card",
  };

  const handleConfirm = () => {
    const query = new URLSearchParams({ total: String(total), method }).toString();
    router.push(`/sales/payment?${query}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar />

      <main className="ml-[198px] p-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-semibold text-gray-900">New sale</h1>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700">
            Main branch
          </button>
        </div>
        <p className="text-gray-500 mb-8">Complete the payment for this sale.</p>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-3 mb-10 max-w-md mx-auto">
          {["Sale", "Payment", "Receipt"].map((step, i) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    i === 0
                      ? "bg-emerald-700 text-white"
                      : i === 1
                      ? "bg-emerald-700 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {i === 0 ? <Check size={14} /> : i + 1}
                </div>
                <span
                  className={`text-xs font-medium ${
                    i === 1 ? "text-emerald-700" : i === 0 ? "text-gray-700" : "text-gray-400"
                  }`}
                >
                  {step}
                </span>
              </div>
              {i < 2 && (
                <div className={`flex-1 h-0.5 mx-2 -mt-5 ${i === 0 ? "bg-emerald-700" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Order summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Order summary</h2>
            <p className="text-sm text-gray-500 mb-4">{items.length} items</p>

            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.qty} × ₦{item.price.toLocaleString()}
                    </p>
                  </div>
                  <span className="font-medium text-gray-900">
                    ₦{(item.price * item.qty).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">₦{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-gray-900">-₦{discount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold pt-1">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900 text-lg">₦{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Confirm payment */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Confirm payment</h2>
            <p className="text-sm text-gray-500 mb-4">
              Payment method selected during checkout
            </p>

            <div className="border border-emerald-600 bg-emerald-50 rounded-lg p-4 flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">
                  N
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {methodLabel[method] ?? method}
                  </p>
                  <p className="text-xs text-gray-500">Selected payment method</p>
                </div>
              </div>
              <span className="text-xs font-medium text-emerald-700 uppercase">Selected</span>
            </div>

            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Amount to collect
            </p>
            <div className="border border-gray-200 rounded-lg px-4 py-3 mb-5">
              <p className="text-xl font-bold text-gray-900">₦{total.toLocaleString()}.00</p>
            </div>

            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Customer
            </p>
            <div className="border border-gray-200 rounded-lg px-4 py-3 mb-6">
              <p className="text-sm font-semibold text-gray-900">Walk-in customer</p>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-3 rounded-lg text-sm font-semibold transition-colors mb-2"
            >
              Confirm & Pay • ₦{total.toLocaleString()}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Confirm to verify the payment and issue the receipt.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Kassa • Secure Payment{" "}
          <span className="ml-4">Payment confirmation will appear before the receipt is issued.</span>
        </p>
      </main>
    </div>
  );
}