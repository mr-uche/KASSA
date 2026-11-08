"use client";

import { useState,useEffect } from "react";
import {
  Loader2,
  Upload,
  CheckCircle2,
  X,
  Menu,
  Bell,
} from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import Link from "next/link";
import { getInventoryContext, getInventoryCategories, kassaPost, type InventoryCategory, type InventoryContext } from "@/lib/inventory-client";

export default function AddProductPage() {
  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "",
    brand: "",
    unit: "",
    description: "",
    sellingPrice: "",
    costPrice: "",
    currentStock: "",
    lowStockThreshold: "",
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [inventoryContext, setInventoryContext] = useState<InventoryContext | null>(null);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleChange = (
    field: keyof typeof form,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
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
  

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const context = await getInventoryContext();
        const data = await getInventoryCategories(context);
        if (cancelled) return;
        setInventoryContext(context);
        setSelectedBranch(context.branchName);
        setCategories(data.filter((category) => category.status === "Active"));
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load categories.");
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (saving || saved) return;
    if (!inventoryContext) return setError("Inventory is not ready. Confirm that your business is set up.");
    if (!form.name.trim() || !form.sku.trim() || !form.category)
      return setError("Enter the product name, SKU, and category.");
    const money = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;
    if (!money.test(form.sellingPrice.trim()) ||
        (form.costPrice.trim() && !money.test(form.costPrice.trim())))
      return setError("Enter a valid naira price with no more than two decimal places.");
    if (!/^\d+$/.test(form.currentStock.trim()) || !/^\d+$/.test(form.lowStockThreshold.trim()))
      return setError("Current stock and low-stock threshold must be whole numbers of zero or more.");
    const currentStock = Number(form.currentStock), lowStockThreshold = Number(form.lowStockThreshold);
    if (!Number.isSafeInteger(currentStock) || !Number.isSafeInteger(lowStockThreshold) ||
        currentStock > 100000000 || lowStockThreshold > 100000000)
      return setError("Stock values must be no greater than 100,000,000.");
    setError("");
    setSaving(true);
    try {
      await kassaPost("/api/inventory/products", {
        businessId: inventoryContext.businessId, branchId: inventoryContext.branchId,
        name: form.name.trim(), sku: form.sku.trim(), categoryId: form.category,
        brand: form.brand.trim() || undefined, unit: form.unit.trim() || undefined,
        description: form.description.trim() || undefined,
        sellingPrice: form.sellingPrice.trim(), costPrice: form.costPrice.trim() || undefined,
        currentStock, lowStockThreshold,
      });
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save the product.");
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <KassaSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="min-h-screen lg:ml-[198px]  ">
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
                Add Product
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

        <p className="text-sm md:text-base text-gray-500 mb-6 px-3 mt-4">
          Add a new product to your catalogue.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-3">
          {/* ================= FORM ================= */}
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-4 md:p-6 space-y-6">
            <div>
              <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-5">
                Product information
              </h2>

              <div className="space-y-5">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Product name{" "}
                    <span className="text-red-500">*</span>
                  </label>

                  <input
                    value={form.name}
                    onChange={(e) =>
                      handleChange("name", e.target.value)
                    }
                    placeholder="e.g. Amoxicillin 500mg"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                {/* SKU + Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Product code / SKU{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <input
                      value={form.sku}
                      onChange={(e) =>
                        handleChange("sku", e.target.value)
                      }
                      placeholder="e.g. AMX-500-001"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Category{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <select
                      value={form.category}
                      onChange={(e) =>
                        handleChange(
                          "category",
                          e.target.value
                        )
                      }
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700 text-gray-500"
                    >
                      <option value="">
                        Select category
                      </option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                    {categories.length === 0 && (
                      <p className="mt-2 text-xs text-amber-700">
                        No active categories yet. <Link href="/products/categories/add" className="underline">Create a category</Link> first.
                      </p>
                    )}
                  </div>
                </div>

                {/* Brand + Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Brand
                    </label>

                    <input
                      value={form.brand}
                      onChange={(e) =>
                        handleChange(
                          "brand",
                          e.target.value
                        )
                      }
                      placeholder="Enter brand"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Unit
                    </label>

                    <input
                      value={form.unit}
                      onChange={(e) =>
                        handleChange(
                          "unit",
                          e.target.value
                        )
                      }
                      placeholder="Piece"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description
                  </label>

                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      handleChange(
                        "description",
                        e.target.value
                      )
                    }
                    placeholder="Add a short product description..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* ================= PRICING & STOCK ================= */}
            <div className="border-t border-gray-100 pt-6">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-5">
                Pricing &amp; stock
              </h2>

              <div className="space-y-5">
                {/* Selling Price + Cost Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Selling price{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        ₦
                      </span>

                      <input
                        value={form.sellingPrice}
                        onChange={(e) =>
                          handleChange(
                            "sellingPrice",
                            e.target.value
                          )
                        }
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Cost price
                    </label>

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        ₦
                      </span>

                      <input
                        value={form.costPrice}
                        onChange={(e) =>
                          handleChange(
                            "costPrice",
                            e.target.value
                          )
                        }
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Current Stock + Threshold */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Current stock{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <input
                      value={form.currentStock}
                      onChange={(e) =>
                        handleChange(
                          "currentStock",
                          e.target.value
                        )
                      }
                      placeholder="0"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Low-stock threshold{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <input
                      value={form.lowStockThreshold}
                      onChange={(e) =>
                        handleChange(
                          "lowStockThreshold",
                          e.target.value
                        )
                      }
                      placeholder="e.g. 10"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ================= PRODUCT IMAGE ================= */}
            <div className="border-t border-gray-100 pt-6">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
                Product image
              </h2>

              <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-200 rounded-lg py-10 cursor-pointer hover:border-emerald-400 transition-colors">
                <Upload
                  size={18}
                  className="text-gray-400 mb-1"
                />

                <span className="text-sm font-medium text-emerald-700">
                  Product images coming soon
                </span>

                <span className="text-xs text-gray-400">
                  Optional · JPG or PNG
                </span>

                <input
                  type="file"
                  disabled
                  accept="image/jpeg,image/png"
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* ================= SAVE PANEL ================= */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 h-fit">
            {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
            {!saved ? (
              <>
                <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-1">
                  Save product
                </h2>

                <p className="text-sm text-gray-500 mb-5">
                  Required fields are marked with *
                </p>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white py-2.5 rounded-lg text-sm font-medium transition-colors mb-3 disabled:opacity-70"
                >
                  {saving && (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  )}

                  {saving ? "Saving..." : "Save Product"}
                </button>

                <Link
                  href="/products"
                  className="flex w-full items-center justify-center border border-emerald-700 text-emerald-700 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors mb-6"
                >
                  Cancel
                </Link>
              </>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 mb-6">
                <CheckCircle2
                  className="mt-0.5 flex-shrink-0 text-emerald-700"
                  size={18}
                />

                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Product added successfully
                  </p>

                  <p className="text-xs text-gray-500">
                    Now available in your catalogue.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSaved(false);
                    setForm({ name: "", sku: "", category: "", brand: "", unit: "", description: "", sellingPrice: "", costPrice: "", currentStock: "", lowStockThreshold: "" });
                  }}
                >
                  <X
                    size={14}
                    className="text-gray-400"
                  />
                </button>
              </div>
            )}

            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              What happens next?
            </h3>

            <p className="text-sm text-gray-500 mb-3">
              Your product will be added to the catalogue
              and available for sales.
            </p>

            <p className="text-sm text-gray-500">
              If stock is at or below the threshold, it will
              appear in Low Stock.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}