"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2, Menu } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import {
  createCustomer, getCustomer, getCustomerBusiness, updateCustomer,
  type CustomerInput,
} from "@/lib/customers-client";

type CustomerEditorProps = { customerId?: string };
type Form = { fullName: string; phone: string; email: string; address: string; notes: string };
const emptyForm: Form = { fullName: "", phone: "", email: "", address: "", notes: "" };

export default function CustomerEditor({ customerId }: CustomerEditorProps) {
  const router = useRouter();
  const editing = Boolean(customerId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [businessId, setBusinessId] = useState("");
  const [branchName, setBranchName] = useState("Loading...");
  const [form, setForm] = useState<Form>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const business = await getCustomerBusiness();
        const record = customerId
          ? await getCustomer(business.businessId, customerId)
          : null;
        if (!active) return;
        setBusinessId(business.businessId);
        setBranchName(business.branchName);
        if (record) {
          setForm({
            fullName: record.fullName,
            phone: record.phone ?? "",
            email: record.email ?? "",
            address: record.address ?? "",
            notes: record.notes ?? "",
          });
        }
        setError("");
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load customer form.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [customerId]);

  function updateField(key: keyof Form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (saving || loading) return;
    if (!businessId) return setError("Your business could not be found. Sign in again.");
    const fullName = form.fullName.trim().replace(/\s+/g, " ");
    const phone = form.phone.trim();
    const email = form.email.trim().toLowerCase();
    if (!fullName) return setError("Enter the customer's full name.");
    if (fullName.length > 120) return setError("Customer name is too long.");
    const digits = phone.replace(/\D/g, "");
    if (!/^\+?[0-9 ()-]{7,24}$/.test(phone) || digits.length < 7 || digits.length > 15)
      return setError("Enter a valid phone number with 7–15 digits.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setError("Enter a valid email address.");
    if (email.length > 254 || form.address.length > 1000 || form.notes.length > 1500)
      return setError("One or more fields are too long.");

    const input: CustomerInput = {
      fullName,
      phone,
      email: email || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    };
    setSaving(true);
    setError("");
    try {
      if (customerId) {
        await updateCustomer(businessId, customerId, input);
      } else {
        await createCustomer(businessId, input);
      }
      router.replace("/customers?" + (editing ? "updated" : "added") + "=true");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save customer.");
    } finally {
      setSaving(false);
    }
  }

  const controlClass = "w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700";

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-[198px]">
        <header className="flex min-h-[80px] items-center justify-between gap-4 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(true)}
              className="shrink-0 rounded-md p-1.5 text-[#374151] transition hover:bg-[#F3F4F6] lg:hidden"
              aria-label="Open menu">
              <Menu size={22} />
            </button>
            <h1 className="truncate text-[18px] font-bold text-[#182033] sm:text-[20px] lg:text-[21px]">
              {editing ? "Edit Customer" : "Add Customer"}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-5">
            <div className="hidden w-[130px] sm:block sm:w-[150px] lg:w-[162px]">
              <div className="flex h-[34px] w-full items-center justify-between rounded-[9px] border border-[#D8DCE3] bg-white px-3 text-[12px] text-[#374151] sm:text-[13px]">
                <span className="truncate">{branchName}</span>
              </div>
            </div>
            <button type="button" aria-label="Notifications"
              className="relative flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-[#F8F9FA]">
              <Bell size={17} className="text-[#98A1AE]" />
              <span className="absolute right-[8px] top-[6px] h-[7px] w-[7px] rounded-full bg-[#E54848]" />
            </button>
            <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-[#E5F5F0] text-[12px] font-semibold text-[#08745F]">
              AO
            </div>
          </div>
        </header>

        <main className="px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10 lg:pt-12">
          <p className="mb-6 text-sm text-gray-500 sm:text-base">
            {editing
              ? "Update this customer's information in your business records."
              : "Create a customer record to keep their information and purchase history organised."}
          </p>
          <div className="max-w-4xl rounded-xl border border-gray-200 bg-white p-5 sm:p-8">
            <h2 className="mb-1 text-lg font-bold text-emerald-800">Customer information</h2>
            <p className="mb-6 text-sm text-gray-500">Fields marked with * are required.</p>

            {loading && <p role="status" className="mb-5 text-sm text-gray-500">Loading customer information...</p>}
            {error && <p role="alert" className="mb-5 rounded-lg border border-red-200 p-3 text-sm text-red-700">{error}</p>}

            <div className="mb-8 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              <div>
                <label htmlFor="customer-name" className="mb-2 block text-sm font-semibold text-gray-800">
                  Full name <span className="text-red-500">*</span>
                </label>
                <input id="customer-name" required maxLength={120} disabled={loading || saving}
                  value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)}
                  placeholder="Enter customer's full name" className={controlClass}/>
              </div>
              <div>
                <label htmlFor="customer-phone" className="mb-2 block text-sm font-semibold text-gray-800">
                  Phone number <span className="text-red-500">*</span>
                </label>
                <input id="customer-phone" type="tel" required maxLength={24} disabled={loading || saving}
                  value={form.phone} onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="Enter phone number" className={controlClass}/>
              </div>
              <div>
                <label htmlFor="customer-email" className="mb-2 block text-sm font-semibold text-gray-800">
                  Email address
                </label>
                <input id="customer-email" type="email" maxLength={254} disabled={loading || saving}
                  value={form.email} onChange={(e) => updateField("email", e.target.value)}
                  placeholder="Enter email address" className={controlClass}/>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-800">Record scope</p>
                <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  Business-wide customer
                </p>
                <p className="mt-1 text-xs text-gray-500">Customer types and VIP tiers are not configured yet.</p>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="customer-address" className="mb-2 block text-sm font-semibold text-gray-800">
                  Address
                </label>
                <textarea id="customer-address" maxLength={1000} disabled={loading || saving}
                  value={form.address} onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Enter customer's address" rows={4}
                  className={controlClass + " resize-none"}/>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="mb-1 text-base font-bold text-emerald-800">Optional details</h3>
              <p className="mb-4 text-sm text-gray-500">Add more information if it will help you serve this customer better.</p>
              <label htmlFor="customer-notes" className="mb-2 block text-sm font-semibold text-gray-800">Notes</label>
              <textarea id="customer-notes" maxLength={1500} disabled={loading || saving}
                value={form.notes} onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Add a note about this customer" rows={3}
                className={controlClass + " resize-none"}/>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => router.push("/customers")}
                className="rounded-lg border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={save} disabled={loading || saving || !businessId}
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 disabled:opacity-60">
                {saving && <Loader2 size={14} className="animate-spin"/>}
                {saving ? "Saving..." : editing ? "Save changes" : "Save Customer"}
              </button>
            </div>
          </div>
        </main>
        <footer className="pb-8 text-center text-xs text-gray-400">Kassa • Customer records</footer>
      </div>
    </div>
  );
}
