//SCALE TO GROWTH PLAN CONFIRMATION MODAL

"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";

export default function SecurePaymentPage() {
  useEffect(() => {
    //  real payment redirect here 
   
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Existing sidebar */}
      <KassaSidebar />

      {/* Background Settings page */}
      <main className="ml-[198px] p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          Settings
        </h1>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 h-48" />
          <div className="bg-white rounded-xl border border-gray-200 h-48" />
          <div className="bg-white rounded-xl border border-gray-200 h-48" />
        </div>

        <div className="mt-6 bg-white rounded-xl border border-gray-200 h-64" />
      </main>

      {/* Dark overlay */}
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
        {/* Payment modal */}
        <div className="w-[330px] bg-white rounded-xl shadow-xl px-4 py-4">

          {/* Step indicator */}
          <p className="text-[7px] font-semibold text-emerald-700 mb-3">
            STEP 3 OF 3
          </p>

          {/* Spinner */}
          <div className="flex justify-center mb-3">
            <div className="relative w-9 h-9 rounded-full border-[3px] border-emerald-100">
              <div className="absolute inset-[-3px] rounded-full border-[3px] border-transparent border-t-emerald-700 animate-spin" />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-[13px] font-semibold text-gray-900 text-center">
            Confirming your downgrade
          </h2>

          {/* Description */}
          <p className="text-[8px] text-gray-500 text-center mt-1 leading-relaxed">
            Updating your billing authorization to ₦12,500/month
          </p>

          {/* Secured by payment partner */}
          <div className="flex justify-center mt-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-100 bg-gray-50">
              <CheckCircle2
                size={10}
                className="text-emerald-700"
              />

              <span className="text-[7px] font-medium text-gray-600">
                Secured by payment partner
              </span>
            </div>
          </div>

          {/* Information box */}
          <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5">
            <p className="text-[7px] text-gray-400 leading-relaxed">
             No charge is being made today. we're just updating your recurring payment authorization so your next invoice reflects the new, lower amount.
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center items-center gap-1.5 mt-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
          </div>

          {/* Cancel */}
          <button
            type="button"
            className="block mx-auto mt-4 text-[7px] text-gray-600 hover:text-gray-900"
          >
            Cancel and stay on scale plan
          </button>
        </div>
      </div>
    </div>
  );
}