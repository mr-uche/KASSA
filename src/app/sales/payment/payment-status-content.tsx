"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock3, Menu, ShieldCheck, AlertTriangle } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import { confirmCash, getSale, type SavedSale } from "@/lib/sales-client";
import { formatNaira } from "@/lib/inventory-client";
import SaleReceipt from "@/components/sales/SaleReceipt";
import {
  startPaystackTestCheckout, verifyPaystackTestPayment,
} from "@/lib/paystack-client";

const paystackChannels = new Set(["CARD", "BANK_TRANSFER", "USSD"]);

export default function PaymentStatusContent() {
  const router = useRouter();
  const params = useSearchParams();
  const saleId = params.get("saleId") ?? "";
  // Paystack adds reference/trxref to callback_url. Neither is trusted as proof of payment.
  const callbackReference = params.get("reference") || params.get("trxref");
  const autoCheckRef = useRef(false);

  const [sale, setSale] = useState<SavedSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState("");
  const [cashReceived, setCashReceived] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!saleId) {
      setError("No saved sale selected. Start from New Sale or Transaction History.");
      setLoading(false);
      return;
    }
    getSale(saleId).then((result) => {
      if (active) { setSale(result); setError(""); }
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Unable to load sale.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [saleId]);

  const verifyWithPaystack = useCallback(async () => {
    if (!saleId) return;
    setVerifying(true); setError(""); setNotice("");
    try {
      const verified = await verifyPaystackTestPayment(saleId);
      const refreshed = await getSale(saleId);
      setSale(refreshed);
      if (verified.needsAttention || (verified.providerStatus === "success" && refreshed.status !== "PAID")) {
        setError("Paystack confirmed this test charge, but Kassa could not fulfill the sale. Reconcile stock and contact the business owner. No paid receipt is issued.");
      } else if (refreshed.status === "PAID" &&
                 refreshed.payments.some((payment) => payment.status === "SUCCEEDED")) {
        router.replace("/sales/success?saleId=" + encodeURIComponent(saleId));
      } else {
        setNotice("Paystack status: " + verified.providerStatus +
          ". This sale remains pending until Paystack confirms success.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Paystack could not verify this test payment.");
    } finally { setVerifying(false); }
  }, [saleId, router]);

  useEffect(() => {
    if (!sale || !callbackReference || autoCheckRef.current) return;
    autoCheckRef.current = true;
    const payment = sale.payments[0];
    if (!payment || payment.reference !== callbackReference) {
      setError("Paystack return reference does not match this sale. No payment was marked successful.");
      return;
    }
    if (payment.provider !== "PAYSTACK_TEST") {
      setError("The returned payment does not belong to the configured Paystack test checkout.");
      return;
    }
    void verifyWithPaystack();
  }, [callbackReference, sale, verifyWithPaystack]);

  async function refreshStatus() {
    if (!saleId || refreshing) return;
    setRefreshing(true); setError(""); setNotice("");
    try {
      const result = await getSale(saleId);
      setSale(result);
      setNotice("Saved sale status reloaded.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to refresh sale.");
    } finally { setRefreshing(false); }
  }

  async function beginCheckout() {
    if (!sale || submitting) return;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid payer email address for Paystack test checkout.");
      return;
    }
    setSubmitting(true); setError(""); setNotice("");
    try {
      const checkoutUrl = await startPaystackTestCheckout(sale.id, email.trim());
      window.location.assign(checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start Paystack test checkout.");
      setSubmitting(false);
    }
  }

  async function handleCashConfirmation() {
    if (!sale || sale.status !== "PENDING_PAYMENT" || sale.payments[0]?.channel !== "CASH" ||
        !cashReceived || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const confirmed = await confirmCash(sale.id);
      setSale(confirmed);
      router.replace("/sales/success?saleId=" + encodeURIComponent(confirmed.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to confirm cash receipt.");
    } finally { setSubmitting(false); }
  }

  const payment = sale?.payments[0];
  const cash = payment?.channel === "CASH";
  const canUsePaystack = payment && paystackChannels.has(payment.channel) &&
    (!payment.provider || payment.provider === "PAYSTACK_TEST") &&
    payment.status === "PENDING";
  const testPayment = payment?.provider === "PAYSTACK_TEST";
  const paid = sale?.status === "PAID" && payment?.status === "SUCCEEDED";
  const needsReview = testPayment && payment.status === "SUCCEEDED" && sale?.status !== "PAID";

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}/>
      <main className="min-h-screen lg:ml-[198px]">
        <header className="flex min-h-[80px] items-center gap-3 border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 lg:hidden" aria-label="Open menu"><Menu size={21}/></button>
          <h1 className="text-[18px] font-bold text-[#182033] sm:text-[21px]">Payment status</h1>
        </header>
        <div className="mx-auto max-w-3xl space-y-5 px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10 lg:pt-12">
          {loading && <p className="text-sm text-gray-500">Loading sale from Kassa...</p>}
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
          {sale && (
            <>
              <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  {paid
                    ? <CheckCircle2 size={23} className="text-emerald-700"/>
                    : <Clock3 size={23} className="text-amber-600"/>}
                  <h2 className="text-lg font-semibold text-gray-900">
                    {paid ? "Payment confirmed" : needsReview ? "Payment requires reconciliation" : "Awaiting payment"}
                  </h2>
                </div>
                {testPayment && (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                    PAYSTACK TEST MODE — No real money was collected. Do not release real goods using a test receipt.
                  </p>
                )}
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {paid ? "This sale has a verified payment and a recorded stock movement."
                    : needsReview ? "Paystack verified the test transaction but Kassa could not complete stock fulfillment. Contact the owner."
                      : cash ? "Confirm payment only after you physically receive the full amount."
                        : "The sale is pending. A checkout redirect or payment screenshot is not proof of payment."}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-gray-100 pt-5 text-sm">
                  <span className="text-gray-500">Reference</span>
                  <span className="break-all text-right font-medium text-gray-900">{sale.reference}</span>
                  <span className="text-gray-500">Amount</span>
                  <span className="text-right text-xl font-bold text-emerald-700">{formatNaira(sale.total)}</span>
                  <span className="text-gray-500">Channel</span>
                  <span className="text-right font-medium text-gray-900">{payment?.channel.replaceAll("_", " ") ?? "Not selected"}</span>
                  <span className="text-gray-500">Payment status</span>
                  <span className="text-right font-medium text-gray-900">{payment?.status ?? "Unknown"}</span>
                </div>
              </section>

              {paid && <SaleReceipt sale={sale} />}

              {cash && sale.status === "PENDING_PAYMENT" && (
                <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
                  <h3 className="font-semibold text-gray-900">Confirm cash received</h3>
                  <p className="mt-1 text-sm text-gray-500">Only confirm after collecting the entire amount. Kassa deducts stock after confirmation.</p>
                  <label className="mt-4 flex items-start gap-3 text-sm text-gray-700">
                    <input type="checkbox" checked={cashReceived} onChange={(event) => setCashReceived(event.target.checked)}
                      className="mt-1 accent-emerald-700"/>
                    I have physically received {formatNaira(sale.total)} in cash.
                  </label>
                  <button type="button" onClick={() => void handleCashConfirmation()}
                    disabled={!cashReceived || submitting}
                    className="mt-5 w-full rounded-lg bg-emerald-800 py-3 text-sm font-semibold text-white disabled:opacity-50">
                    {submitting ? "Recording payment..." : "Confirm cash received"}
                  </button>
                </section>
              )}

              {canUsePaystack && sale.status === "PENDING_PAYMENT" && (
                <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={21} className="text-emerald-700"/>
                    <h3 className="text-base font-semibold text-gray-900">Paystack test checkout</h3>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    Simulate a {payment.channel.replaceAll("_", " ").toLowerCase()} payment through Paystack.
                    Kassa will verify the reference, NGN amount and success status with Paystack before issuing a test receipt.
                  </p>
                  <label htmlFor="payer-email" className="mt-4 block text-sm font-medium text-gray-700">Payer email</label>
                  <input id="payer-email" type="email" autoComplete="email" maxLength={254}
                    value={email} onChange={(event) => setEmail(event.target.value)}
                    placeholder="customer@example.com"
                    className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-700"/>
                  <button type="button" onClick={() => void beginCheckout()} disabled={submitting || verifying}
                    className="mt-4 w-full rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                    {submitting ? "Starting checkout..." : "Open Paystack test checkout"}
                  </button>
                  <p className="mt-3 text-xs text-gray-500">Only test credentials are accepted. Your card details are entered on Paystack's hosted page, never Kassa.</p>
                </section>
              )}

              {testPayment && sale.status !== "PAID" && (
                <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
                  <h3 className="font-semibold text-gray-900">Verify with Paystack</h3>
                  <p className="mt-2 text-sm text-gray-500">If you returned from checkout or a webhook was delayed, verify directly with Paystack. Repeating verification never deducts stock twice.</p>
                  <button type="button" onClick={() => void verifyWithPaystack()} disabled={verifying || refreshing}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-800 disabled:opacity-50">
                    <ShieldCheck size={17}/>{verifying ? "Verifying..." : "Verify Paystack payment"}
                  </button>
                </section>
              )}

              {!cash && !canUsePaystack && !testPayment && sale.status === "PENDING_PAYMENT" && (
                <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-900"><AlertTriangle size={17}/> Payment channel not yet integrated</h3>
                  <p className="mt-2 text-sm leading-6 text-amber-800">
                    Hosted test checkout currently supports card, bank transfer and USSD.
                    Physical POS terminals and wallet funding require separate integrations. No receipt can be issued for an unverified payment.
                  </p>
                </section>
              )}


              {!paid && (
                <button type="button" onClick={() => void refreshStatus()} disabled={refreshing || verifying}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 disabled:opacity-50">
                  {refreshing ? "Reloading..." : "Reload saved status"}
                </button>
              )}
            </>
          )}
          <div className="flex flex-wrap gap-3">
            <Link href="/transactions" className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700">Transaction history</Link>
            <Link href="/sales/new" className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700">New sale</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
