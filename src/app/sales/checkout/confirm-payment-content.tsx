"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSale, type PaymentMethod, type SaleDraft } from "@/lib/sales-client";
import { formatNaira } from "@/lib/inventory-client";
import KassaSidebar from "@/components/KassaSidebar";
import { Check, Menu, Bell } from "lucide-react";

type SaleItem = { id: string; name: string; price: number; qty: number };
type DraftWithPreview = SaleDraft & { previewItems: SaleItem[]; customerName?: string };

export default function ConfirmPaymentContent() {
  const router = useRouter();


  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("Main branch");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [draft, setDraft] = useState<DraftWithPreview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = subtotal;
  const discount = 0;
  const method = draft?.channel ?? "BANK_TRANSFER";

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kassa_sale_draft");
      if (!raw) return setError("No order to review. Return to New Sale.");
      const data: unknown = JSON.parse(raw);
      if (!data || typeof data !== "object") throw new Error("Invalid order");
      const stored = data as DraftWithPreview;
      if (!Array.isArray(stored.items) || !Array.isArray(stored.previewItems) ||
          !stored.items.length || !stored.businessId || !stored.branchId ||
          !stored.clientRequestId) throw new Error("Invalid order");
      setDraft(stored);
      setItems(stored.previewItems);
    } catch {
      setError("The order could not be loaded. Return to New Sale.");
    }
  }, []);

  const methodLabel: Record<PaymentMethod, string> = {
    BANK_TRANSFER: "Bank Transfer", POS: "POS", CASH: "Cash",
    CARD: "Card", USSD: "USSD", WALLET: "Wallet",
  };

  // Get the selected branch
  useEffect(() => {
    const savedBranch = localStorage.getItem("selectedBranch");

    if (savedBranch) {
      setSelectedBranch(savedBranch);
    }
  }, []);

  // Listen for branch changes
  useEffect(() => {
    const handleBranchChange = () => {
      const savedBranch = localStorage.getItem("selectedBranch");

      if (savedBranch) {
        setSelectedBranch(savedBranch);
      }
    };

    window.addEventListener("branchChanged", handleBranchChange);

    return () => {
      window.removeEventListener("branchChanged", handleBranchChange);
    };
  }, []);

  const handleConfirm = async () => {
    if (!draft || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const sale = await createSale({
        businessId: draft.businessId, branchId: draft.branchId,
        clientRequestId: draft.clientRequestId, channel: draft.channel,
        customerId: draft.customerId, items: draft.items,
      });
      sessionStorage.removeItem("kassa_sale_draft");
      router.replace("/sales/payment?saleId=" + encodeURIComponent(sale.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save sale.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      {/* Sidebar */}
      <KassaSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main className="min-h-screen lg:ml-[198px]">
        {/* Header */}
        <header className="flex min-h-[80px] items-center justify-between gap-4 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 lg:px-8">
          {/* Left side */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 rounded-md p-1.5 text-[#374151] transition hover:bg-[#F3F4F6] lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <h1 className="truncate text-[18px] font-bold text-[#182033] sm:text-[20px] lg:text-[21px]">
                New sale
            </h1>
          </div>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            {/* Branch */}
            <div className="hidden w-[130px] sm:block sm:w-[150px] lg:w-[162px]">
              <div className="flex h-[34px] w-full items-center rounded-[9px] border border-[#D8DCE3] bg-white px-3 text-[12px] text-[#374151] sm:text-[13px]">
                <span className="truncate">{selectedBranch}</span>
              </div>
            </div>

            {/* Notification */}
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-[#F8F9FA]"
            >
              <Bell size={17} className="text-[#98A1AE]" />

              <span className="absolute right-[8px] top-[6px] h-[7px] w-[7px] rounded-full bg-[#E54848]" />
            </button>

            {/* Avatar */}
            <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-[#E5F5F0] text-[12px] font-semibold text-[#08745F]">
              AO
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10 lg:pt-12">
          <p className="mb-8 text-sm text-gray-500 sm:text-base">
            Review the order before saving it. Cash receipt or provider verification is required to complete payment.
          </p>

          {/* Stepper */}
          <div className="mx-auto mb-10 flex w-full max-w-md items-start">
            {["Sale", "Payment", "Receipt"].map((step, i) => (
              <div
                key={step}
                className="flex min-w-0 flex-1 items-start"
              >
                {/* Step */}
                <div className="flex min-w-0 flex-col items-center gap-2">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      i === 0 || i === 1
                        ? "bg-emerald-700 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {i === 0 ? <Check size={14} /> : i + 1}
                  </div>

                  <span
                    className={`truncate text-xs font-medium ${
                      i === 1
                        ? "text-emerald-700"
                        : i === 0
                        ? "text-gray-700"
                        : "text-gray-400"
                    }`}
                  >
                    {step}
                  </span>
                </div>

                {/* Connecting line */}
                {i < 2 && (
                  <div
                    className={`mt-3 h-0.5 min-w-[20px] flex-1 ${
                      i === 0
                        ? "bg-emerald-700"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Main cards */}
          <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 lg:grid-cols-2">
            {/* =========================
                ORDER SUMMARY
            ========================== */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
              <h2 className="mb-1 text-lg font-semibold text-gray-900">
                Order summary
              </h2>

              <p className="mb-4 text-sm text-gray-500">
                {items.length} {items.length === 1 ? "item" : "items"}
              </p>

              {/* Products */}
              <div className="mb-4 space-y-3">
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex items-start justify-between gap-4 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="break-words text-gray-900">
                          {item.name}
                        </p>

                        <p className="text-xs text-gray-500">
                          {item.qty} × ₦
                          {item.price.toLocaleString()}
                        </p>
                      </div>

                      <span className="shrink-0 font-medium text-gray-900">
                        ₦
                        {(item.price * item.qty).toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-3 text-sm text-gray-400">
                    No items found for this sale.
                  </p>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-gray-500">
                    Subtotal
                  </span>

                  <span className="text-gray-900">
                    ₦{subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-gray-500">
                    Discount
                  </span>

                  <span className="text-gray-900">
                    -₦{discount.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between gap-4 pt-1 font-semibold">
                  <span className="text-gray-900">
                    Total
                  </span>

                  <span className="text-lg text-gray-900">
                    ₦{total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* =========================
                CONFIRM PAYMENT
            ========================== */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
              <h2 className="mb-1 text-lg font-semibold text-gray-900">
                Save pending sale
              </h2>

              <p className="mb-4 text-sm text-gray-500">
                The sale will remain pending until payment has been confirmed.
              </p>

              {/* Payment method for pending sale */}
              <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-emerald-600 bg-emerald-50 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                    N
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {methodLabel[method] ?? method}
                    </p>

                    <p className="text-xs text-gray-500">
                      Selected payment method
                    </p>
                  </div>
                </div>

                <span className="shrink-0 text-xs font-medium uppercase text-emerald-700">
                  Selected
                </span>
              </div>

              {/* Amount */}
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                Amount to collect
              </p>

              <div className="mb-5 rounded-lg border border-gray-200 px-4 py-3">
                <p className="text-xl font-bold text-gray-900">
                  {formatNaira(total)}
                </p>
              </div>

              {/* Customer */}
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                Customer
              </p>

              <div className="mb-6 rounded-lg border border-gray-200 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">
                  {draft?.customerName ?? "Walk-in customer"}
                </p>
              </div>

              {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
              {/* Confirm button */}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!draft || !items.length || submitting}
                className="disabled:opacity-50 mb-2 w-full rounded-lg bg-emerald-800 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-900"
              >
                {submitting ? "Saving sale..." : "Create pending sale • " + formatNaira(total)}
              </button>

              <p className="text-center text-xs text-gray-500">
                Creating a sale does not verify payment or issue a receipt.
                Card, bank transfer and USSD can proceed to Paystack's TEST checkout on the next screen.
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-gray-400">
            Kassa • Sales & payment review
            <span className="mt-1 block sm:ml-4 sm:mt-0 sm:inline">
              The backend calculates the final price from the current catalogue.
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}

