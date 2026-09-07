"use client";

import {useRouter} from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import KassaSidebar from "@/components/KassaSidebar";
import { Loader2 } from "lucide-react";

export default function AddBranchPage() {
  const router = useRouter();    
  const [saving, setSaving] = useState(false);  
  const [form, setForm] = useState({
    name: "",
    code: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    status: "Active",
  });

  const handleSave = async () => {
  setSaving(true);
  await new Promise((resolve) => setTimeout(resolve, 1000)); // remove once real API is wired up

  setSaving(false);

  setTimeout(() => {
    router.push("/staff-branches?added=branch");
  }, 1200);
};

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar />

      <main className="ml-[198px] p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Staff & Branches</h1>
        <p className="text-gray-500 mb-6">
          Manage your team, branches, roles and access.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mb-1">Add branch</h2>
        <p className="text-gray-500 mb-6">
          Create a new business location and assign staff to it.
        </p>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Branch information
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Enter the details for this location.
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Branch name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. Wuse Branch"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Branch code <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.code}
                    onChange={(e) => handleChange("code", e.target.value)}
                    placeholder="e.g. WUSE-01"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone number
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="e.g. 0803 123 4567"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Branch address <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Street address"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="e.g. Abuja"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    <option value="">Select state</option>
                    <option value="FCT">FCT (Abuja)</option>
                    <option value="Lagos">Lagos</option>
                    <option value="Kano">Kano</option>
                    <option value="Rivers">Rivers</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Branch status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Add branch</h3>
              <p className="text-sm text-gray-500 mb-5">
                Review before creating the location.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-5">
                <p className="text-sm font-semibold text-gray-900 mb-2">What happens next?</p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Branch appears in your branch list</li>
                  <li>• You can assign staff to it</li>
                </ul>
              </div>

              <div className="border-t border-gray-100 pt-4 mb-5">
                <p className="text-sm font-semibold text-gray-900 mb-1">Branch access</p>
                <p className="text-sm text-gray-500">
                  Staff assigned to this branch can work from this location based on
                  their assigned role and permissions.
                </p>
              </div>

              <button 
               onClick={handleSave}
               disabled={saving}
               className="w-full flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white py-2.5 rounded-lg text-sm font-medium transition-colors mb-3 disabled:opacity-70">
                {saving && <Loader2 size={14} className="animate-spin" />}
               {saving ? "Adding..." : "Add branch"}
              </button>
              <Link
                  href="/staff-branches"
                className="block w-full text-center border border-gray-200 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 mb-3"
              >
                Cancel
              </Link>
              <p className="text-xs text-gray-400 text-center">
                You can edit branch details later from the branch actions menu.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}