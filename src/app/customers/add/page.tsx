"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, Loader2 } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";

export default function AddCustomerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    customerType: "Regular customer",
    address: "",
    notes: "",
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSaving(false);
    setShowToast(true);

    setTimeout(() => {
      router.push("/customers?added=true");
    }, 1200);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:ml-[198px]">
        {/* Header */}
        <header className="flex h-[72px] items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 rounded-md p-1.5 text-gray-600 transition hover:bg-gray-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Add Customer</h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button className="hidden sm:flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700">
              Main branch
              <span className="text-gray-400">▾</span>
            </button>
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
              AO
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <p className="text-gray-500 mb-6 text-sm sm:text-base">
            Create a customer record to keep their information and purchase history organised.
          </p>

          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 max-w-3xl">
            <h2 className="text-lg font-semibold text-emerald-800 mb-1">Customer information</h2>
            <p className="text-sm text-gray-500 mb-5">Fields marked with * are required.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  placeholder="Enter customer's full name"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone number <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <input
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Customer type
                </label>
                <select
                  value={form.customerType}
                  onChange={(e) => handleChange("customerType", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                >
                  <option>Regular customer</option>
                  <option>Wholesale customer</option>
                  <option>Corporate account</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Address
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Enter customer's address"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 resize-none"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-base font-semibold text-emerald-800 mb-1">Optional details</h3>
              <p className="text-sm text-gray-500 mb-4">
                Add more information if it will help you serve this customer better.
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Add a note about this customer"
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 resize-none"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => router.push("/customers")}
                className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Saving..." : "Save Customer"}
              </button>
            </div>
          </div>
        </main>

        <footer className="pb-6 text-center text-[11px] text-gray-400">
          Kassa • Secure Payment
        </footer>
      </div>
    </div>
  );
}