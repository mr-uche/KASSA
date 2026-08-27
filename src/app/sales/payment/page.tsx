"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";

const steps = ["Sale", "Payment", "Receipt"] as const;

const saleStatusItems = [
  { label: "Sale confirmed", state: "done" },
  { label: "Payment processing", state: "active" },
  { label: "Receipt", state: "pending" },
] as const;

export default function ProcessingPaymentPage() {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar />

      <main className="ml-[198px] p-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-semibold text-gray-900">Processing Payment</h1>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700">
            Main branch
          </button>
        </div>
        <p className="text-gray-500 mb-8">
          We&apos;re verifying your payment. Please don&apos;t close this screen.
        </p>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-3 mb-10 max-w-md mx-auto">
          {steps.map((step, i) => {
            const isDone = i === 0;
            const isActive = i === 1;
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                      isDone
                        ? "bg-emerald-700 text-white"
                        : isActive
                        ? "bg-emerald-700 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isDone ? <Check size={14} /> : i + 1}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isActive ? "text-emerald-700" : isDone ? "text-gray-700" : "text-gray-400"
                    }`}
                  >
                    {step}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 -mt-5 ${
                      i === 0 ? "bg-emerald-700" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-6 max-w-4xl">
          {/* Processing card */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full border-4 border-gray-100 border-t-amber-500 animate-spin mb-6" />

            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Processing payment{".".repeat(dots)}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              We&apos;re verifying your payment with the payment provider.
            </p>

            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Amount</p>
            <p className="text-3xl font-bold text-gray-900 mb-5">₦24,500.00</p>

            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-100 mb-6">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center">
                N
              </span>
              <div className="text-left">
                <p className="text-sm font-medium text-emerald-800">Bank Transfer</p>
                <p className="text-xs text-emerald-600">Payment method already selected</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 bg-gray-50 px-4 py-2 rounded-lg">
              Please don&apos;t refresh, close, or leave this page.
            </p>
          </div>

          {/* Sale status panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Sale status</h3>

            <div className="space-y-4 mb-6">
              {saleStatusItems.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      item.state === "done"
                        ? "bg-emerald-600"
                        : item.state === "active"
                        ? "bg-amber-500"
                        : "bg-gray-200"
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      item.state === "pending" ? "text-gray-400" : "text-gray-700"
                    }`}
                  >
                    {item.label}
                  </span>
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
                <p className="text-sm font-semibold text-amber-600">Pending verification</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Amount</p>
                <p className="text-sm font-semibold text-gray-900">₦24,500</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">Kassa • Secure Payment</p>
      </main>
    </div>
  );
}