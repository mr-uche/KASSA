"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";

export default function ReceiptContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-h-screen lg:ml-[198px]">
        <header className="flex min-h-[80px] items-center gap-3 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="shrink-0 rounded-md p-1.5 text-[#374151] hover:bg-[#F3F4F6] lg:hidden"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-[21px] font-bold text-[#182033]">Receipt</h1>
        </header>
        <div className="mx-auto mt-8 max-w-2xl px-4 sm:px-8">
          <section className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-gray-900">No verified receipt available</h2>
            <p className="mt-3 text-sm text-gray-500">
              Real receipts will appear after Kassa records a sale and verifies its payment.
              Sample products and fabricated receipt details have been removed.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-900"
            >
              View products
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
