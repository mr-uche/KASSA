"use client";

import { useState,useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {Menu, Bell,Loader2} from "lucide-react"
import KassaSidebar from "@/components/KassaSidebar";
import { createRole, staffContext } from "@/lib/staff-branches-client";

const permissionOptions = [
  "View dashboard",
  "Manage sales & transactions",
  "Manage products & inventory",
  "View reports & analytics",
  "Manage customers",
];

export default function AddRolePage() {
  const [form, setForm] = useState({ name: "", description: "" });
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    staffContext().then((context) => {
      if (context.myRole !== "Owner") throw new Error("Only owners may create roles.");
      if (active) setBusinessId(context.businessId);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Unable to load business.");
    });
    return () => { active = false; };
  }, []);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    "View dashboard": true,
    "Manage sales & transactions": true,
    "Manage products & inventory": false,
    "View reports & analytics": false,
    "Manage customers": false,
  });

  // Branch selected from the dashboard
        const [selectedBranch, setSelectedBranch] = useState("Main branch");
      
        // Get the selected branch from the dashboard
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
      
          window.addEventListener("storage", handleBranchChange);
      
          return () => {
            window.removeEventListener("storage", handleBranchChange);
          };
        }, []);

const handleSave = async () => {
    if (saving || !businessId) return;
    if (!form.name.trim()) return setError("Enter a role name.");
    setSaving(true);
    setError("");
    try {
      await createRole({
        businessId, name: form.name.trim(), description: form.description.trim(),
        permissions: permissionOptions.filter((permission) => permissions[permission]),
      });
      router.replace("/staff-branches?added=role");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create role.");
    } finally {
      setSaving(false);
    }
  };
  

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const togglePermission = (perm: string) => {
    setPermissions((prev) => ({
      ...prev,
      [perm]: !prev[perm],
    }));
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="ml-0 md:ml-[198px] ">
        {/* Header */}
                <header className="flex min-h-[80px] items-center justify-between gap-4 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 lg:px-8">
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
                        Add role
                    </h1>
                  </div>
        
                  <div className="flex shrink-0 items-center gap-3 sm:gap-5">
                      {/* Branch display - no dropdown */}
                    <div className="hidden w-[130px] sm:block sm:w-[150px] lg:w-[162px]">
                      <div className="flex h-[34px] w-full items-center justify-between rounded-[9px] border border-[#D8DCE3] bg-white px-3 text-[12px] text-[#374151] sm:text-[13px]">
                        <span className="truncate">{selectedBranch}</span>
                      </div>
                    </div>
        
                    <button className="relative flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#F8F9FA]">
                      <Bell size={17} className="text-[#98A1AE]" />
        
                      <span className="absolute right-[8px] top-[6px] h-[7px] w-[7px] rounded-full bg-[#E54848]" />
                    </button>
        
                    <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#E5F5F0] text-[12px] font-semibold text-[#08745F]">
                      AO
                    </div>
                  </div>
                </header>
        
        <p className="text-sm sm:text-base text-gray-500 mb-6 mt-4 px-3">
          Create a custom role and choose what this role can access.
        </p>

        {error && <p role="alert" className="mb-4 px-3 text-sm text-red-700">{error}</p>}
        {/* Main responsive layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-3">
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
                  work. Only owners can manage roles.
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
                  <li>• Existing roles are read-only in this phase</li>
                </ul>
              </div>

               <button
                onClick={handleSave}
                disabled={saving || !businessId}
                className="w-full flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white py-2.5 rounded-lg text-sm font-medium transition-colors mb-3 disabled:opacity-70"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Adding..." : " Add role"}
              </button>

              {/* Cancel */}
              <Link
                href="/staff-branches"
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