"use client";

import Link from "next/link"
import { useState } from "react";
import { ArrowLeft, Keyboard, Info, ScanLine } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";

export default function EnterProductCodePage() {
  const [code, setCode] = useState("");

  return (
    <div className="min-h-screen bg-gray-50">
       <KassaSidebar/>
      {/* Header */}
      <header className="flex h-[80px] items-center justify-between border-b border-[#E5E7EB] bg-white px-[250px]">
        <h1 className="text-[21px] font-bold text-[#182033]">
          Enter product code
        </h1>

        <div className="flex items-center gap-5">
          <button className="flex h-9 items-center gap-1 rounded-md border border-[#E5E7EB] px-3 text-[13px] text-[#182033]">
            Main branch
            <span className="text-[#98A1AE]">▾</span>
          </button>
          <span className="h-2 w-2 rounded-full bg-[#E54848]" />
          <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#0F4C3A] text-[13px] font-semibold text-white">
            AO
          </div>
        </div>
      </header>
       
       <Link
       href="/scan"
       className="mt-4 ml-[250px] flex items-center gap-1 text-[13px] text-[#0F4C3A] px[350px]">
        <ArrowLeft size={14} />
        Back to scanner
       </Link>

      {/* Content */}
      <section className="flex items-stretch justify-center gap-6  px-[32px] pb-[40px] pt-[24px]">
        {/* Manual entry card */}
        <div className="flex-1 max-w-[560px] rounded-2xl border border-[#E5E7EB] bg-white p-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#E3F2EC]">
            <Keyboard className="text-[#0F4C3A]" size={26} />
          </div>

          <h2 className="text-[19px] font-semibold text-[#182033]">
            Enter product code manually
          </h2>
          <p className="mt-1.5 text-[13px] text-[#98A1AE]">
            Enter the barcode, SKU, or product code to find a product.
          </p>

          <div className="mt-8 text-left">
            <label className="text-[13px] font-medium text-[#182033]">
              Product code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. AMX-250 or 8901234567890"
              className="mt-1.5 w-full rounded-lg border-2 border-[#0e876f] px-4 py-2.5 text-[13px] text-[#182033] outline-none focus:border-[#0F4C3A]"
            />
          </div>

          <button className="mt-4 w-full rounded-lg bg-[#0F4C3A] py-2.5 text-[13px] font-medium text-white hover:bg-[#0C3D2F]">
            Find product
          </button>

          <p className="mt-5 text-[12px] text-[#98A1AE]">
            You can also scan the barcode instead.
          </p>

          <button className="mx-auto mt-3 flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-4 py-2 text-[13px] text-[#182033]">
            <ScanLine size={14} />
            Return to scanner
          </button>
        </div>

        {/* Quick tip card */}
        <div className="w-[280px] flex-shrink-0 h-[250px] rounded-2xl border border-[#E5E7EB] bg-white p-6">
          <h3 className="text-[14px] font-semibold text-[#182033]">
            Quick tip
          </h3>

          <div className="mt-3 flex gap-2 text-[13px] text-[#182033]">
            <Info size={15} className="mt-0.5 flex-shrink-0 text-[#98A1AE]" />
            <p>Use the product SKU or barcode number printed on the package.</p>
          </div>

          <div className="mt-6 border-t border-[#E5E7EB] pt-5">
            <p className="text-[11px] text-[#98A1AE]">Example</p>
            <p className="text-[13px] font-semibold text-[#182033]">AMX-250</p>
            <p className="mt-1 text-[12px] text-[#98A1AE]">
              or a 12–13 digit barcode
            </p>
          </div>
        </div>
      </section>

      <footer className="pb-6 text-center text-[11px] text-[#98A1AE]">
        Kassa Business App • Product lookup
      </footer>
   </div>
  );
}