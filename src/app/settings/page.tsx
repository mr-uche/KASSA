"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Loader2, Menu, ShieldAlert } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import { getInventoryContext } from "@/lib/inventory-client";
import {
  getBusinessSettings, updateBusinessSettings, type BusinessSettings,
} from "@/lib/business-settings";

const navigation = [
  "Business profile",
  "Subscription & Billing",
  "Payout Preferences",
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notifications, setNotifications] = useState<NotificationPreferences>(defaultNotifications);

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
        <header className="flex min-h-[80px] items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Open menu" onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-gray-700 hover:bg-gray-100 lg:hidden"><Menu size={22}/></button>
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
          <nav aria-label="Settings sections" className="w-full shrink-0 lg:w-64">
            <div className="rounded-xl border border-gray-200 bg-white p-2">
              {navigation.map((item) => (
                <button type="button" key={item} onClick={() => { setSection(item); setError(""); setSuccess(""); }}
                  className={"w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors " +
                    (section === item ? "bg-emerald-50 text-emerald-800" :
                      item === "Delete Account" ? "text-red-600 hover:bg-red-50" : "text-gray-600 hover:bg-gray-50")}>
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
                    Cash receipt confirmation is available. Electronic payment processing, verification and subscription billing still need a payment provider connection.
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
                  Account-wide CSV, PDF and XLSX exports aren't connected yet.
                  No export request is being processed, and no example download is shown as a real file.
                </p>
                <Link href="/reports" className="mt-5 inline-flex rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-gray-50">
                  View your actual reports
                </Link>
              </section>
            )}

            {section === "Delete Account" && (
              <section className={cardClass}>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-red-700">
                  <ShieldAlert size={20}/> Account deletion
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Permanent account deletion requires an authenticated backend deletion workflow and a retention review for financial records.
                  That workflow has not been implemented. Kassa will not falsely report your account as deleted.
                </p>
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  No deletion has been performed. Your account and business records remain unchanged.
                </p>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
