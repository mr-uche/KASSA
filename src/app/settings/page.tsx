"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Loader2, Menu, ShieldAlert } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import Logo from "@/components/logo";
import { getInventoryContext } from "@/lib/inventory-client";
import {
  getBusinessSettings, updateBusinessSettings, type BusinessSettings,
} from "@/lib/business-settings";
import {
  reconcilePaystackTestPayments, type PaystackReconciliation,
} from "@/lib/paystack-client";
import {
  getBusinessExport, downloadBusinessExport,
  type ExportDateRange, type ExportFormat, type ExportSection,
} from "@/lib/data-export";

const navigation = [
  "Business profile",
  "Subscription & Billing",
  "Payout Preferences",
  "Payments & Reconciliation",
  "Notifications",
  "Data Export",
  "Delete Account",
] as const;
type Section = (typeof navigation)[number];

type NotificationKey =
  | "successfulPayments" | "failedPayments" | "lowStockAlerts"
  | "payoutUpdates" | "staffActivity" | "securityAlerts"
  | "productUpdates" | "channelEmail" | "channelInApp" | "channelSms";
type NotificationPreferences = Record<NotificationKey, boolean>;
const defaultNotifications: NotificationPreferences = {
  successfulPayments: true, failedPayments: true, lowStockAlerts: true,
  payoutUpdates: true, staffActivity: false, securityAlerts: true,
  productUpdates: false, channelEmail: true, channelInApp: true, channelSms: false,
};
const notificationRows: { key: NotificationKey; title: string; description: string }[] = [
  { key: "successfulPayments", title: "Successful payments", description: "Alert after a verified payment" },
  { key: "failedPayments", title: "Failed payments", description: "Alert when payment attempts fail" },
  { key: "lowStockAlerts", title: "Low stock", description: "Alert when items need restocking" },
  { key: "payoutUpdates", title: "Payout updates", description: "Changes to payout processing" },
  { key: "staffActivity", title: "Staff activity", description: "Important changes made by staff" },
  { key: "securityAlerts", title: "Security alerts", description: "Important account security events" },
  { key: "productUpdates", title: "Product updates", description: "Inventory and product changes" },
  { key: "channelEmail", title: "Email", description: "Email alert preference" },
  { key: "channelInApp", title: "In-app", description: "Notifications displayed in Kassa" },
  { key: "channelSms", title: "SMS", description: "SMS alert preference" },
];

const exportOptions: { key: ExportSection; label: string }[] = [
  { key: "transactions", label: "Transactions" },
  { key: "productsInventory", label: "Products & Inventory" },
  { key: "customers", label: "Customers" },
  { key: "staff", label: "Staff" },
  { key: "branches", label: "Branches" },
  { key: "reportsAnalytics", label: "Reports & Analytics" },
];

const fieldClass = "w-full min-w-0 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50";
const cardClass = "rounded-xl border border-gray-200 bg-white p-4 sm:p-6";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-label={label} aria-checked={checked}
      onClick={onChange} className={"relative h-6 w-11 shrink-0 rounded-full transition-colors " +
        (checked ? "bg-emerald-700" : "bg-gray-200")}>
      <span className={"absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all " +
        (checked ? "right-0.5" : "left-0.5")}/>
    </button>
  );
}

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [section, setSection] = useState<Section>("Business profile");
  const [context, setContext] = useState<{ businessId: string; branchId: string } | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [form, setForm] = useState({
    businessName: "", businessType: "", branchAddress: "", branchPhone: "",
  });
  const [schedule, setSchedule] = useState<"INSTANT" | "DAILY" | "WEEKLY">("DAILY");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconciled, setReconciled] = useState<PaystackReconciliation | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notifications, setNotifications] = useState<NotificationPreferences>(defaultNotifications);
  const [exportSelections, setExportSelections] = useState<Record<ExportSection, boolean>>({
    transactions: true, productsInventory: true, customers: true,
    staff: true, branches: true, reportsAnalytics: true,
  });
  const [exportFormat, setExportFormat] = useState<ExportFormat>("CSV");
  const [exportDateRange, setExportDateRange] = useState<ExportDateRange>("ALL");
  const [exporting, setExporting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [accountClosed, setAccountClosed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const membership = await getInventoryContext();
      const scope = { businessId: membership.businessId, branchId: membership.branchId };
      const record = await getBusinessSettings(scope.businessId, scope.branchId);
      setContext(scope);
      setSettings(record);
      setForm({
        businessName: record.businessName,
        businessType: record.businessType,
        branchAddress: record.branchAddress,
        branchPhone: record.branchPhone,
      });
      setSchedule(record.payoutSchedule);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const onBranch = () => { void load(); };
    window.addEventListener("branchChanged", onBranch);
    return () => window.removeEventListener("branchChanged", onBranch);
  }, [load]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kassa_local_notification_preferences");
      if (!raw) return;
      const stored: unknown = JSON.parse(raw);
      if (!stored || typeof stored !== "object") return;
      setNotifications((current) => {
        const next = { ...current };
        for (const key of Object.keys(current) as NotificationKey[]) {
          if (typeof (stored as Record<string, unknown>)[key] === "boolean") {
            next[key] = (stored as Record<string, boolean>)[key];
          }
        }
        return next;
      });
    } catch { /* Keep default local preferences. */ }
  }, []);

  async function saveProfile() {
    if (!context || saving || loading) return;
    if (!form.businessName.trim()) {
      setError("Enter the business name."); return;
    }
    setSaving(true); setError(""); setSuccess("");
    try {
      const updated = await updateBusinessSettings(context.businessId, {
        businessName: form.businessName.trim(),
        businessType: form.businessType.trim(),
        branchId: context.branchId,
        branchAddress: form.branchAddress.trim(),
        branchPhone: form.branchPhone.trim(),
      });
      setSettings(updated);
      setForm({
        businessName: updated.businessName, businessType: updated.businessType,
        branchAddress: updated.branchAddress, branchPhone: updated.branchPhone,
      });
      setSuccess("Business profile saved to Kassa.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save business settings.");
    } finally { setSaving(false); }
  }

  async function saveSchedule() {
    if (!context || loading || saving) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const updated = await updateBusinessSettings(context.businessId, { payoutSchedule: schedule, branchId: context.branchId });
      setSettings(updated);
      setSchedule(updated.payoutSchedule);
      setSuccess("Payout preference saved. Transfers are not enabled until payment verification is connected.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save payout preference.");
    } finally { setSaving(false); }
  }

  async function runReconciliation() {
    if (!context || loading || reconciling) return;
    setReconciling(true); setReconciled(null); setError(""); setSuccess("");
    try {
      const summary = await reconcilePaystackTestPayments(context.businessId, context.branchId);
      setReconciled(summary);
      setSuccess("Finished verifying up to five pending Paystack test payments against Paystack.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reconcile Paystack test payments.");
    } finally { setReconciling(false); }
  }

  async function runExport() {
    if (!context || exporting || loading) return;
    const sections = exportOptions.map((item) => item.key).filter((key) => exportSelections[key]);
    if (!sections.length) {
      setError("Select at least one section to export.");
      return;
    }
    setExporting(true); setError(""); setSuccess("");
    try {
      const snapshot = await getBusinessExport(context.businessId, sections, exportDateRange);
      downloadBusinessExport(snapshot, exportFormat);
      setSuccess("Downloaded your " + exportFormat + " export with " +
        snapshot.datasets.reduce((sum, dataset) => sum + dataset.rows.length, 0) +
        " records. Store the file securely.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not export business data.");
    } finally { setExporting(false); }
  }

  async function closeAccount() {
    if (deleting || accountClosed || deletePhrase !== "DELETE ACCOUNT" || !deletePassword) return;
    const approved = window.confirm(
      "Permanently close your Kassa login? You will lose access immediately. Financial and business records may be retained for audit. This cannot be undone.",
    );
    if (!approved) return;
    setDeleting(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password: deletePassword, confirmation: deletePhrase }),
        cache: "no-store",
      });
      const result: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = result && typeof result === "object" && "message" in result
          ? (result as { message: unknown }).message : null;
        throw new Error(typeof message === "string" ? message :
          Array.isArray(message) ? message.join(". ") : "Account closure failed.");
      }
      if (!result || typeof result !== "object" ||
          !("closed" in result) || result.closed !== true) {
        throw new Error("Account closure was not confirmed by Kassa.");
      }
      setAccountClosed(true);
      setDeletePassword(""); setDeletePhrase("");
      try {
        localStorage.removeItem("selectedBranchId");
        localStorage.removeItem("selectedBranch");
        localStorage.removeItem("kassa_local_notification_preferences");
      } catch { /* Already signed out server-side */ }
      window.location.assign("/login?accountClosed=1");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not close account.");
    } finally { setDeleting(false); }
  }

  function toggleNotification(key: NotificationKey) {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    try { localStorage.setItem("kassa_local_notification_preferences", JSON.stringify(next)); }
    catch { /* Preference can still be used for this browser session. */ }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}/>
      <main className="min-h-screen lg:ml-[198px]">
        <header className="sticky top-0 z-30 flex min-h-[80px] items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:static lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Open menu" onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-gray-700 hover:bg-gray-100 lg:hidden"><Menu size={22}/></button>
            <Logo width={88} height={24} className="lg:hidden"/>
            <h1 className="truncate text-[18px] font-bold text-[#182033] sm:text-[20px] lg:text-[21px]">Settings</h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-xs text-gray-500 sm:block">{settings?.branchName ?? ""}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50">
              <Bell size={17} className="text-gray-400"/>
            </span>
          </div>
        </header>

        <div className="flex min-w-0 flex-col gap-4 px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:flex-row lg:gap-6 lg:px-8 lg:pb-10 lg:pt-12">
          <nav aria-label="Settings sections" className="w-full min-w-0 shrink-0 overflow-x-auto pb-1 lg:w-64 lg:overflow-visible lg:pb-0">
            <div className="flex w-max gap-1 rounded-xl border border-gray-200 bg-white p-2 lg:w-full lg:flex-col">
              {navigation.map((item) => (
                <button type="button" key={item} aria-pressed={section === item}
                  onClick={() => { setSection(item); setError(""); setSuccess(""); }}
                  className={"shrink-0 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors lg:w-full lg:whitespace-normal " +
                    (section === item
                      ? item === "Delete Account" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"
                      : item === "Delete Account" ? "text-red-600 hover:bg-red-50" : "text-gray-600 hover:bg-gray-50")}>
                  {item}
                </button>
              ))}
            </div>
          </nav>

          <div className="min-w-0 flex-1 space-y-5">
            {loading && <p role="status" className="text-sm text-gray-500">Loading your business settings...</p>}
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {success && <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 size={17}/> {success}
            </p>}

            {section === "Business profile" && (
              <>
                <section className={cardClass}>
                  <h2 className="mb-1 text-lg font-semibold text-gray-900">Business profile</h2>
                  <p className="mb-6 text-sm text-gray-500">Changes here are saved to your Kassa business and selected branch.</p>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Business name
                      <input disabled={loading || saving || !context} className={fieldClass + " mt-2"} maxLength={150}
                        value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })}/>
                    </label>
                    <label className="block text-sm font-medium text-gray-700">
                      Business type
                      <input disabled={loading || saving || !context} className={fieldClass + " mt-2"} maxLength={100}
                        value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })}/>
                    </label>
                    <label className="block text-sm font-medium text-gray-700">
                      Branch contact phone
                      <input disabled={loading || saving || !context} className={fieldClass + " mt-2"} maxLength={32} type="tel"
                        value={form.branchPhone} onChange={(e) => setForm({ ...form, branchPhone: e.target.value })}/>
                    </label>
                    <label className="block text-sm font-medium text-gray-700">
                      Selected branch
                      <input className={fieldClass + " mt-2"} value={settings?.branchName ?? ""} readOnly/>
                    </label>
                    <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
                      Branch address
                      <input disabled={loading || saving || !context} className={fieldClass + " mt-2"} maxLength={300}
                        value={form.branchAddress} onChange={(e) => setForm({ ...form, branchAddress: e.target.value })}/>
                    </label>
                  </div>
                  <button type="button" onClick={() => void saveProfile()} disabled={loading || saving || !context}
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50">
                    {saving && <Loader2 size={16} className="animate-spin"/>} {saving ? "Saving..." : "Save changes"}
                  </button>
                </section>
                <section className={cardClass}>
                  <h3 className="text-base font-semibold text-gray-900">Payment setup</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Cash confirmation is supported. Paystack hosted checkout, webhooks and verification are available in test mode for cards, bank transfer and USSD only. Subscription billing and real-money settlements are not enabled.
                  </p>
                  <Link href="/sales/new" className="mt-3 inline-block text-sm font-semibold text-emerald-800 hover:underline">Go to New Sale</Link>
                </section>
              </>
            )}

            {section === "Subscription & Billing" && (
              <section className={cardClass}>
                <h2 className="text-lg font-semibold text-gray-900">Subscription & Billing</h2>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Subscription billing is not connected yet. No payment card, successful invoice or active paid plan has been verified in Kassa.
                  Once a provider is integrated, your real subscription, invoices and billing history will appear here.
                </p>
                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Billing status: <strong>Not configured</strong>. No charges are collected from this screen.
                </div>
              </section>
            )}

            {section === "Payout Preferences" && (
              <>
                <section className={cardClass}>
                  <h2 className="text-lg font-semibold text-gray-900">Payout preferences</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    These are saved merchant preferences, not an active payout arrangement. Account ownership and bank details have not been verified by a payment provider.
                  </p>
                  <div className="mt-5 rounded-lg border border-gray-200 p-4">
                    <p className="text-xs font-medium uppercase text-gray-500">Bank preference (unverified)</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{settings?.settlementBankName || "No bank preference saved"}</p>
                    <p className="mt-1 text-xs text-gray-500">{settings?.settlementAccountLast4 ? "Account ending in " + settings.settlementAccountLast4 : "No account reference saved"}</p>
                  </div>
                </section>
                <section className={cardClass}>
                  <h3 className="text-base font-semibold text-gray-900">Preferred payout schedule</h3>
                  <label className="mt-4 block text-sm font-medium text-gray-700">
                    Frequency
                    <select className={fieldClass + " mt-2"} disabled={loading || saving || !context}
                      value={schedule} onChange={(e) => setSchedule(e.target.value as typeof schedule)}>
                      <option value="INSTANT">Instant (preference only)</option>
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                    </select>
                  </label>
                  <p className="mt-3 text-xs text-gray-500">Selecting a schedule does not trigger any payout or transfer.</p>
                  <button type="button" onClick={() => void saveSchedule()} disabled={loading || saving || !context}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                    {saving && <Loader2 size={16} className="animate-spin"/>} Save preference
                  </button>
                </section>
              </>
            )}

            {section === "Payments & Reconciliation" && (
              <section className={cardClass}>
                <h2 className="text-lg font-semibold text-gray-900">Paystack test payment reconciliation</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Owner-only verification of up to five pending Paystack test payments in the selected branch.
                  Kassa checks Paystack directly and finalizes each verified sale at most once.
                  Payments with insufficient stock remain flagged for manual review.
                </p>
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                  TEST MODE — no real funds move. This checks customer payments, not merchant bank settlements.
                </p>
                <p className="mt-3 text-sm text-gray-600">Selected branch: <strong>{settings?.branchName || "Not loaded"}</strong></p>
                <button type="button" onClick={() => void runReconciliation()}
                  disabled={loading || !context || reconciling}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                  {reconciling && <Loader2 size={16} className="animate-spin"/>}
                  {reconciling ? "Checking Paystack..." : "Reconcile pending test payments"}
                </button>
                {reconciled && (
                  <div className="mt-5 space-y-3" role="status">
                    <p className="text-sm font-semibold text-gray-900">
                      Checked: {reconciled.checked} · Completed sales: {reconciled.paid} · Needs review: {reconciled.needsReview}
                    </p>
                    {reconciled.checked === 0 && (
                      <p className="text-sm text-gray-500">No pending Paystack test payments were found for this branch.</p>
                    )}
                    <div className="space-y-2">
                      {reconciled.results.map((entry) => (
                        <div key={entry.reference} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                          <p className="break-all font-semibold text-gray-900">{entry.reference}</p>
                          <p className="mt-1 text-gray-600">
                            Provider: {entry.providerStatus} · Sale: {entry.saleStatus ?? "Not finalized"}
                          </p>
                          {entry.needsAttention && <p className="mt-1 font-semibold text-red-700">Manual stock reconciliation required.</p>}
                          {entry.error && <p className="mt-1 text-red-700">{entry.error}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {section === "Notifications" && (
              <section className={cardClass}>
                <h2 className="text-lg font-semibold text-gray-900">Notification preferences</h2>
                <p className="mt-2 text-sm text-gray-500">These switches are stored on this browser only. Email, push and SMS delivery are not connected yet.</p>
                <div className="mt-5 divide-y divide-gray-100">
                  {notificationRows.map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                        <p className="mt-1 text-xs text-gray-500">{item.description}</p>
                      </div>
                      <Toggle label={item.title} checked={notifications[item.key]} onChange={() => toggleNotification(item.key)}/>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {section === "Data Export" && (
              <section className={cardClass}>
                <h2 className="text-lg font-semibold text-gray-900">Data export</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Download real records belonging to this business. The file is prepared
                  securely by Kassa, and it is not shared with other merchants.
                </p>
                <p className="mt-3 text-xs text-amber-800">
                  Exports can contain private customer and staff details. Store them securely.
                  For complete exports, each selected section must contain at most 5,000 records;
                  larger sections will return an error instead of exporting incomplete data.
                </p>
                <fieldset className="mt-5">
                  <legend className="text-sm font-semibold text-gray-900">Select data</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {exportOptions.map((item) => (
                      <label key={item.key}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700">
                        <input type="checkbox" className="h-4 w-4 accent-emerald-700"
                          checked={exportSelections[item.key]}
                          onChange={() => setExportSelections((current) => ({
                            ...current, [item.key]: !current[item.key],
                          }))}/>
                        {item.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-gray-700">
                    Export format
                    <select className={fieldClass + " mt-2"} value={exportFormat}
                      onChange={(event) => setExportFormat(event.target.value as ExportFormat)}>
                      <option value="CSV">CSV</option>
                      <option value="XLSX">Excel (XLSX)</option>
                      <option value="PDF">PDF</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Date range
                    <select className={fieldClass + " mt-2"} value={exportDateRange}
                      onChange={(event) => setExportDateRange(event.target.value as ExportDateRange)}>
                      <option value="ALL">All available data</option>
                      <option value="LAST_30_DAYS">Last 30 days</option>
                      <option value="LAST_90_DAYS">Last 90 days</option>
                      <option value="THIS_YEAR">This year</option>
                    </select>
                  </label>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Date filtering applies to transactions and newly created customers.
                  Products, current stock, staff and branches represent the present business snapshot.
                  Financial test-mode transactions are labelled separately.
                </p>
                <button type="button" onClick={() => void runExport()}
                  disabled={loading || !context || exporting}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                  {exporting && <Loader2 size={16} className="animate-spin"/>}
                  {exporting ? "Preparing export..." : "Export selected data"}
                </button>
              </section>
            )}

            {section === "Delete Account" && (
              <section className={cardClass}>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-red-700">
                  <ShieldAlert size={20}/> Permanently close your account
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-700">
                  This closes your own Kassa login, revokes your sessions and removes your
                  identifying profile details. You will be signed out immediately and cannot
                  restore the account.
                </p>
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  <strong>Important:</strong> Business records and historical financial transactions
                  are preserved for accounting and audit integrity. Closing your login does
                  not automatically delete merchant businesses, staff, customers or sales.
                  If you manage a team, arrange access for another owner before closure.
                </div>
                <div className="mt-5 space-y-4">
                  <label className="block text-sm font-semibold text-gray-800">
                    Enter your current password to confirm your identity
                    <input type="password" autoComplete="current-password"
                      className={fieldClass + " mt-2"} value={deletePassword}
                      onChange={(event) => setDeletePassword(event.target.value)}
                      maxLength={128} disabled={deleting || accountClosed}/>
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    Type DELETE ACCOUNT exactly
                    <input className={fieldClass + " mt-2"} value={deletePhrase}
                      placeholder="DELETE ACCOUNT" autoComplete="off"
                      onChange={(event) => setDeletePhrase(event.target.value)}
                      disabled={deleting || accountClosed}/>
                  </label>
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={() => { setSection("Business profile"); setDeletePassword(""); setDeletePhrase(""); }}
                    disabled={deleting} className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="button" onClick={() => void closeAccount()}
                    disabled={!deletePassword || deletePhrase !== "DELETE ACCOUNT" || deleting || accountClosed}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {deleting && <Loader2 size={16} className="animate-spin"/>}
                    {deleting ? "Closing account..." : "Permanently close my Kassa account"}
                  </button>
                </div>
                {accountClosed && (
                  <p role="status" className="mt-4 text-sm font-medium text-gray-600">
                    Your account has been closed. Redirecting to sign-in.
                  </p>
                )}
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
