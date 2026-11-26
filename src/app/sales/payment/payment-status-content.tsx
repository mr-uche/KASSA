"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock3, Menu, ShieldCheck, AlertTriangle } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import {
  confirmCash, confirmMerchantPayment, getSale, getPaymentVerificationStatus,
  listReceivingAccounts, type SavedSale, type CheckoutReceivingAccount,
  type PaymentVerificationStatus,
} from "@/lib/sales-client";
import { formatNaira } from "@/lib/inventory-client";
import SaleReceipt from "@/components/sales/SaleReceipt";

const merchantChannels = new Set(["BANK_TRANSFER", "CARD", "POS"]);
const channelLabels: Record<string, string> = {
  CASH: "Cash", BANK_TRANSFER: "Bank transfer", CARD: "Card",
  POS: "POS terminal", USSD: "USSD", WALLET: "Wallet",
};

export default function PaymentStatusContent() {
  const router = useRouter();
  const params = useSearchParams();
  const saleId = params.get("saleId") ?? "";
  const [sale, setSale] = useState<SavedSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [receiptChecked, setReceiptChecked] = useState(false);
  const [receivingAccounts, setReceivingAccounts] = useState<CheckoutReceivingAccount[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [verification, setVerification] = useState<PaymentVerificationStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
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
    getSale(saleId).then(result => {
      if (active) { setSale(result); setError(""); }
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : "Unable to load sale.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [saleId]);

  useEffect(() => {
    if (!sale || sale.payments[0]?.channel !== "BANK_TRANSFER") return;
    let active = true;
    listReceivingAccounts({ businessId: sale.businessId, branchId: sale.branchId })
      .then(accounts => {
        if (!active) return;
        setReceivingAccounts(accounts);
        setSelectedBankId(current => accounts.some(account => account.id === current)
          ? current : (accounts.find(account => account.isDefault) ?? accounts[0])?.id ?? "");
      }).catch(() => { if (active) setReceivingAccounts([]); });
    return () => { active = false; };
  }, [sale?.businessId, sale?.branchId, sale?.payments[0]?.channel]);

  useEffect(() => {
    if (!sale || sale.status !== "PENDING_PAYMENT" || sale.payments[0]?.channel === "CASH") return;
    let active = true;
    setCheckingStatus(true);
    getPaymentVerificationStatus(sale.id)
      .then(status => { if (active) setVerification(status); })
      .catch(() => { if (active) setVerification(null); })
      .finally(() => { if (active) setCheckingStatus(false); });
    return () => { active = false; };
  }, [sale?.id, sale?.status, sale?.payments[0]?.channel]);

  async function refreshStatus() {
    if (!saleId || refreshing) return;
    setRefreshing(true); setError(""); setNotice("");
    try {
      setSale(await getSale(saleId));
      setNotice("Saved sale status reloaded.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to refresh sale.");
    } finally { setRefreshing(false); }
  }

  async function confirmMerchantReceipt() {
    if (!sale || submitting || sale.status !== "PENDING_PAYMENT" || !receiptChecked) return;
    const payment = sale.payments[0];
    if (!payment || payment.status !== "PENDING" || payment.provider) return;
    if (payment.channel !== "CASH" && !merchantChannels.has(payment.channel)) return;
    if (!window.confirm("Confirm receipt of " + formatNaira(sale.total) +
      " through " + (channelLabels[payment.channel] ?? payment.channel) +
      "? Verify receipt, not screenshots. Confirmation updates stock.")) return;
    setSubmitting(true); setError(""); setNotice("");
    try {
      const confirmed = payment.channel === "CASH"
        ? await confirmCash(sale.id)
        : await confirmMerchantPayment(sale.id, payment.channel === "BANK_TRANSFER" ? selectedBankId || undefined : undefined);
      if (confirmed.status !== "PAID" || !confirmed.payments.some(p => p.status === "SUCCEEDED")) {
        throw new Error("The backend did not confirm this payment. Do not issue goods.");
      }
      setSale(confirmed);
      router.replace("/sales/success?saleId=" + encodeURIComponent(confirmed.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payment confirmation was not saved.");
    } finally { setSubmitting(false); }
  }

  const payment = sale?.payments[0];
  const paid = sale?.status === "PAID" && payment?.status === "SUCCEEDED";
  const historicalTest = payment?.provider === "PAYSTACK_TEST";
  const manualMerchant = !!payment && merchantChannels.has(payment.channel) &&
    !payment.provider && payment.status === "PENDING";
  const cash = payment?.channel === "CASH" && !payment.provider && payment.status === "PENDING";
  const eligible = (cash || manualMerchant) && sale?.status === "PENDING_PAYMENT";
  const label = channelLabels[payment?.channel ?? ""] ?? "Payment method not set";

  return <div className="min-h-screen overflow-x-hidden bg-gray-50">
    <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}/>
    <main className="min-h-screen lg:ml-[198px]">
      <header className="flex min-h-[80px] items-center gap-3 border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <button type="button" onClick={() => setSidebarOpen(true)}
          className="rounded-md p-2 lg:hidden" aria-label="Open menu"><Menu size={21}/></button>
        <h1 className="text-[18px] font-bold text-[#182033] sm:text-[21px]">Payment confirmation</h1>
      </header>
      <div className="mx-auto max-w-3xl space-y-5 px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10 lg:pt-12">
        {loading && <p role="status" className="text-sm text-gray-500">Loading sale from KASSA…</p>}
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
        {sale && <>
          <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              {paid ? <CheckCircle2 size={23} className="text-emerald-700"/>
                : <Clock3 size={23} className="text-amber-600"/>}
              <h2 className="text-lg font-semibold text-gray-900">{paid
                ? "Payment recorded" : "Awaiting merchant payment confirmation"}</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              {paid
                ? historicalTest ? "Non-live transaction. No real funds received."
                  : "Payment recorded by staff."
                : "Payments go directly to your business. Verify receipt before confirming."}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-gray-100 pt-5 text-sm">
              <dt className="text-gray-500">Sale reference</dt>
              <dd className="break-all text-right font-medium text-gray-900">{sale.reference}</dd>
              <dt className="text-gray-500">Total to receive</dt>
              <dd className="text-right text-xl font-bold text-emerald-700">{formatNaira(sale.total)}</dd>
              <dt className="text-gray-500">Customer payment method</dt>
              <dd className="text-right font-medium text-gray-900">{label}</dd>
              <dt className="text-gray-500">Status</dt>
              <dd className="text-right font-medium text-gray-900">{payment?.status ?? "Unknown"}</dd>
            </dl>
          </section>
          {paid && <SaleReceipt sale={sale}/>}
          {eligible && <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <ShieldCheck size={20} className="text-emerald-700"/>
              Verify that the business received payment
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {cash
                ? "Confirm the full cash amount received."
                : payment?.channel === "BANK_TRANSFER"
                  ? "Verify bank credit, not customer screenshots."
                  : "Check the successful POS record and amount."}
            </p>
            {manualMerchant && <>
              {payment?.channel === "BANK_TRANSFER" && <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Business receiving account</p>
                {receivingAccounts.length > 0 ? <>
                  <select aria-label="Business receiving bank account" value={selectedBankId}
                    onChange={e => setSelectedBankId(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
                    {receivingAccounts.map(account => <option key={account.id} value={account.id}>
                      {account.bankName} · {account.accountNumber} {account.isDefault ? "(default)" : ""}
                    </option>)}
                  </select>
                  {receivingAccounts.filter(a => a.id === selectedBankId).map(a => (
                    <p key={a.id} className="mt-2 text-sm text-gray-700">{a.accountName}
                      <span className="ml-2 text-xs text-amber-800">(Not bank-verified)</span>
                    </p>
                  ))}
                </> : <p className="mt-2 text-sm text-amber-800">
                  No receiving account added.
                </p>}
              </div>}
              <p className="mt-3 text-xs text-gray-600">
                {checkingStatus ? "Checking payment status…" :
                  verification?.status === "NOT_CONNECTED"
                    ? "Manual confirmation required."
                    : "Verify payment in your bank or POS records."}
              </p>
            </>}
            <label className="mt-4 flex items-start gap-3 text-sm text-gray-800">
              <input type="checkbox" className="mt-1 accent-emerald-700"
                checked={receiptChecked} onChange={event => setReceiptChecked(event.target.checked)}/>
              {cash
                ? "I received the full cash amount."
                : "I confirm the full amount was received."}
            </label>
            <button type="button" onClick={() => void confirmMerchantReceipt()}
              disabled={submitting || !receiptChecked}
              className="mt-5 w-full rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {submitting ? "Recording confirmation…" : "Confirm payment"}
            </button>
            <p className="mt-3 text-xs text-gray-500">Confirmation updates stock.</p>
          </section>}
          {!paid && !eligible && <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-semibold"><AlertTriangle size={17}/> This payment needs business-owner review</div>
            <p className="mt-2">Contact the owner to reconcile this payment.</p>
          </section>}
          {!paid && <button type="button" onClick={() => void refreshStatus()} disabled={refreshing || submitting}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 disabled:opacity-50">
            {refreshing ? "Reloading…" : "Reload saved status"}
          </button>}
        </>}
        <div className="flex flex-wrap gap-3">
          <Link href="/transactions" className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700">Transaction history</Link>
          <Link href="/sales/new" className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700">New sale</Link>
        </div>
      </div>
    </main>
  </div>;
}
