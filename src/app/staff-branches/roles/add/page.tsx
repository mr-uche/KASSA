"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import KassaSidebar from "@/components/KassaSidebar";
import { Loader2 } from "lucide-react";

const permissionOptions = [
  "View dashboard",
  "Manage sales & transactions",
  "Manage products & inventory",
  "View reports & analytics",
  "Manage customers",
  "Manage staff & branches",
];

export default function AddRolePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    "View dashboard": true,
    "Manage sales & transactions": true,
    "Manage products & inventory": false,
    "View reports & analytics": false,
    "Manage customers": false,
    "Manage staff & branches": false,
  });

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const togglePermission = (perm: string) => {
    setPermissions((prev) => ({
      ...prev,
      [perm]: !prev[perm],
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSaving(false);

    setTimeout(() => {
      router.push("/staff-branches?added=role");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar />

      <main className="ml-0 md:ml-[198px] p-4 sm:p-6 lg:p-8">
        {/* Page heading */}
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">
          Staff & Branches
        </h1>

        <p className="text-sm sm:text-base text-gray-500 mb-6">
          Manage your team, branches, and access permissions.
        </p>

        {/* Add role heading */}
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">
          Add role
        </h2>

        <p className="text-sm sm:text-base text-gray-500 mb-6">
          Create a custom role and choose what this role can access.
        </p>

        {/* Main responsive layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Main form */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-5">
              Role information
            </h3>

            <div className="space-y-5 mb-6">
              {/* Role name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Role name <span className="text-red-500">*</span>
                </label>

                <input
                  value={form.name}
                  onChange={(e) =>
                    handleChange("name", e.target.value)
                  }
                  placeholder="e.g. Sales Supervisor"
                  className="w-full px-3 sm:px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    handleChange("description", e.target.value)
                  }
                  placeholder="Describe what this role is responsible for"
                  rows={3}
                  className="w-full px-3 sm:px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 resize-none"
                />
              </div>
            </div>

            {/* Permissions */}
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                Permissions
              </h3>

              <p className="text-sm text-gray-500 mb-4">
                Select the areas this role can access.
              </p>

              <div className="space-y-3">
                {permissionOptions.map((perm) => (
                  <label
                    key={perm}
                    className="flex items-start gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={permissions[perm]}
                      onChange={() => togglePermission(perm)}
                      className="w-4 h-4 mt-0.5 shrink-0 rounded border-gray-300 text-emerald-700 focus:ring-emerald-700 accent-emerald-700"
                    />

                    <span className="text-sm text-gray-700 leading-5">
                      {perm}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right / Role access */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                Role access
              </h3>

              <p className="text-sm text-gray-500 mb-4">
                Keep permissions focused on the role.
              </p>

              {/* Good practice */}
              <div className="bg-gray-50 rounded-lg p-4 mb-5">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Good practice
                </p>

                <p className="text-sm text-gray-600 leading-5">
                  Give staff only the access they need to perform their
                  work. You can edit permissions later.
                </p>
              </div>

              {/* What happens next */}
              <div className="border-t border-gray-100 pt-4 mb-5">
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  What happens next?
                </p>

                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Role appears in Roles & permissions</li>
                  <li>• You can assign it to staff</li>
                  <li>• Permissions can be updated later</li>
                </ul>
              </div>

              {/* Add role button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white py-2.5 rounded-lg text-sm font-medium transition-colors mb-3 disabled:opacity-70"
              >
                {saving && (
                  <Loader2 size={14} className="animate-spin" />
                )}

                {saving ? "Adding..." : "Add role"}
              </button>

              {/* Cancel */}
              <Link
                href="/staff"
                className="block w-full text-center border border-gray-200 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}