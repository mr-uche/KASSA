"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Share2 } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";

const transaction = {
  id: "TXN-2026-000146",
  status: "Success",
  date: "20 Aug 2026 • 9:14 AM",
  channel: "Bank Transfer",
  customer: "Mary Adeyemi",
  cashier: "Ifeoma Bassey",
  branch: "Main Branch",
  amountPaid: 24500,
  paymentMethod: "Bank Transfer",
  items: [
    { name: "Amoxicillin 500mg", qty: 2, amount: 8000 },
    { name: "Vitamin C 1000mg", qty: 1, amount: 6500 },
    { name: "Paracetamol", qty: 2, amount: 5000 },
    { name: "Hand Sanitizer", qty: 1, amount: 5500 },
  ],
  subtotal: 25000,
  discount: 500,
  total: 24500,
};

export default function TransactionDetailsPage() {
  const [disputeStatus, setDisputeStatus] = useState<null | "review">(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar />

      <main className="ml-[198px] p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Transaction Details
        </h1>
        <p className="text-gray-500 mb-6">
          Review the transaction, itemised receipt, and dispute options.
        </p>

        {/* Summary bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 flex items-center justify-between">
          <div className="grid grid-cols-4 gap-8">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Transaction ID
              </p>
              <p className="font-semibold text-gray-900">{transaction.id}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
              <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                {transaction.status.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Date & time
              </p>
              <p className="font-medium text-gray-900">{transaction.date}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Channel</p>
              <p className="font-medium text-gray-900">{transaction.channel}</p>
            </div>
          </div>
        </div>

        {disputeStatus === "review" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{transaction.customer}</p>
              <span className="text-xs text-gray-400">
                {transaction.date} · {transaction.paymentMethod}
              </span>
            </div>

            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
              Dispute status
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-medium mb-4">
              Dispute under review
            </span>

            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Dispute ID</p>
            <p className="font-semibold text-gray-900 mb-3">DSP-000184</p>

            <p className="text-sm text-gray-500">
              The dispute has been submitted and is awaiting review.
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* Itemised receipt */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Itemised Receipt</h2>
            <p className="text-sm text-gray-500 mb-4">Customer: {transaction.customer}</p>

            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-3 font-medium">Item</th>
                  <th className="pb-3 font-medium text-center">Qty</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transaction.items.map((item) => (
                  <tr key={item.name} className="border-b border-gray-50">
                    <td className="py-3 text-gray-900">{item.name}</td>
                    <td className="py-3 text-center text-gray-700">{item.qty}</td>
                    <td className="py-3 text-right font-medium text-gray-900">
                      ₦{item.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1.5 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">₦{transaction.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Discount</span>
                <span className="text-gray-900">-₦{transaction.discount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t border-gray-100">
                <span className="text-gray-900">Total</span>
                <span className="text-emerald-700 text-lg">
                  ₦{transaction.total.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex justify-between border-t border-gray-100 pt-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-1">Payment method</p>
                <p className="font-medium text-gray-900">{transaction.paymentMethod}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Cashier</p>
                <p className="font-medium text-gray-900">{transaction.cashier}</p>
              </div>
            </div>
          </div>

          {/* Transaction summary + actions */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Transaction Summary
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Customer</p>
                  <p className="text-sm font-semibold text-gray-900">{transaction.customer}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Cashier</p>
                  <p className="text-sm font-semibold text-gray-900">{transaction.cashier}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Branch</p>
                  <p className="text-sm font-semibold text-gray-900">{transaction.branch}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Amount paid</p>
                  <p className="text-lg font-bold text-emerald-700">
                    ₦{transaction.amountPaid.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Actions</h3>
              <button className="w-full flex items-center gap-2 justify-center bg-emerald-800 hover:bg-emerald-900 text-white py-2.5 rounded-lg text-sm font-medium transition-colors mb-3">
                <Download size={16} />
                Download Receipt
              </button>
              <button className="w-full flex items-center gap-2 justify-center border border-gray-200 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 mb-3">
                <Share2 size={16} />
                Share Receipt
              </button>
              <Link
                href={`/transactions/${transaction.id}/dispute`}
                className="w-full flex items-center justify-center border border-red-200 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Dispute Transaction
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}