"use client";
 
import { useState, useEffect } from "react";
import { CheckCircle2, X, Menu, Bell } from "lucide-react";
import Link from "next/link";
import KassaSidebar from "@/components/KassaSidebar";
import { getInventoryContext, kassaPost } from "@/lib/inventory-client";
 
export default function AddCategoryPage() {
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "Active",
  });
  const [saved, setSaved] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
 
  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
 
  const handleSave = async () => {
    if (saving) return;
    if (!form.name.trim()) {
      setError("Enter a category name.");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const context = await getInventoryContext();
      await kassaPost("/api/inventory/categories", {
        businessId: context.businessId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        isActive: form.status === "Active",
      });
      setSaved(true);
      setShowBanner(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save category.");
    } finally {
      setSaving(false);
    }
  };

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
        
 
  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
 
      <main className="lg:ml-[198px] ">
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
                Add Category
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
 
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-3 mt-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
              Category information
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Enter the basic details for this product category.
            </p>
 
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Category name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. Prescription Medicines"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
 
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Briefly describe the products in this category"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 resize-none"
                />
              </div>
 
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Category status
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
 
            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-6 pt-2">
              <Link
                href="/products"
                className="text-center px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="px-5 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium transition-colors"
              >
                {saving ? "Saving..." : saved ? "Category saved" : "Save category"}
              </button>
            </div>
          </div>
 
          <div className="space-y-4">
            {saved && showBanner && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                  Category added
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Your category has been saved successfully.
                </p>
 
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-800">
                      Category added successfully
                    </p>
                    <p className="text-sm text-emerald-700 mt-0.5">
                      The new category has been added.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowBanner(false)}
                    className="text-emerald-700 hover:text-emerald-900"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
 
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">
                What happens next?
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Category appears in Categories.</li>
                <li>• Products can be assigned to it.</li>
                <li>• You can edit it later.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
 