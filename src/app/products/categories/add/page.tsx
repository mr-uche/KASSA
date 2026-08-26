"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import KassaSidebar from "@/components/KassaSidebar";

export default function AddCategoryPage() {
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "Active",
  });
  const [saved, setSaved] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setSaved(true);
    setShowBanner(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar />

      <main className="ml-[198px] p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Products & Inventory
        </h1>
        <p className="text-gray-500 mb-6">
          Manage your products, categories, and stock levels.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mb-1">Add category</h2>
        <p className="text-gray-500 mb-6">
          Create a category to organize products in your catalogue.
        </p>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
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

            <div className="flex justify-end gap-3 mt-6 pt-2">
              <Link
                href="/products"
                className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                onClick={handleSave}
                className="px-5 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium transition-colors"
              >
                Save category
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {saved && showBanner && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Category added</h3>
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

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-3">
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