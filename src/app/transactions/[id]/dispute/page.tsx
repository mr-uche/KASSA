"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";

const transaction = {
  id: "TXN-104582",
  customer: "Mary Adeyemi",
  amount: 12400,
  method: "Transfer",
  status: "Successful",
};

const disputeReasons = [
  "Incorrect amount",
  "Duplicate transaction",
  "Payment not received",
  "Wrong customer charged",
  "Other",
];

export default function DisputeTransactionPage() {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChipClick = (chip: string) => {
    setSelectedChip(chip);
    setReason(chip);
  };

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      router.push(`/transactions/${transaction.id}`);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar />

      <main className="ml-[198px] p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Dispute Transaction</h1>
        <p className="text-gray-500 mb-6">
          Submit a dispute for this transaction and provide the relevant details.
        </p>

        {/* Transaction summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <p className="text-sm font-semibold text-gray-900 mb-4">Transaction summary</p>
          <div className="grid grid-cols-4 gap-8">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Transaction ID
              </p>
              <p className="font-semibold text-gray-900">{transaction.id}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                {transaction.status.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Customer</p>
              <p className="font-medium text-gray-900">{transaction.customer}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Amount</p>
              <p className="font-medium text-gray-900">₦{transaction.amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Payment</p>
              <p className="font-medium text-gray-900">{transaction.method}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Dispute form */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">What is the issue?</h2>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Select a dispute reason
              </label>
              <select
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setSelectedChip(null);
                }}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="">Select a dispute reason</option>
                {disputeReasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-5">
              <p className="text-sm font-medium text-gray-700 mb-2">Reason</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleChipClick("Incorrect amount")}
                  className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium ${
                    selectedChip === "Incorrect amount"
                      ? "border-emerald-700 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Incorrect amount
                </button>
                <button
                  onClick={() => handleChipClick("Duplicate transaction")}
                  className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium ${
                    selectedChip === "Duplicate transaction"
                      ? "border-emerald-700 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Duplicate transaction
                </button>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Describe the issue
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us what happened..."
                rows={4}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 resize-none"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Supporting evidence <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-200 rounded-lg py-8 cursor-pointer hover:border-emerald-400 transition-colors">
                <Upload size={18} className="text-gray-400 mb-1" />
                <span className="text-sm font-medium text-emerald-700">Attach file</span>
                <span className="text-xs text-gray-400">
                  Receipt, payment confirmation, screenshot or document
                </span>
                <input type="file" className="hidden" />
              </label>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => router.back()}
                className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason || submitting}
                className="px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>

          {/* Before you submit */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-fit">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Before you submit</h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Payment</p>
                <p className="text-sm font-semibold text-emerald-700">Successful ✓</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Dispute</p>
                <p className="text-sm font-semibold text-amber-600">Not submitted</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Review</p>
                <p className="text-sm text-gray-700">
                  Hefa support will review your submission.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}