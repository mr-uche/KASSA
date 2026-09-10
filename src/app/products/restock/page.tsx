"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import KassaSidebar from "@/components/KassaSidebar";
import { Loader2, Menu } from "lucide-react";

const productOptions = [
  { name: "Paracetamol 500mg", currentStock: 8 },
  { name: "Amoxicillin 500mg", currentStock: 8 },
  { name: "Vitamin C 1000mg", currentStock: 5 },
];

export default function RestockProductPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(
    productOptions[0].name
  );

  const [quantityToAdd, setQuantityToAdd] = useState("50");
  const [supplierRef, setSupplierRef] = useState("");
  const [note, setNote] = useState("");

  const current =
    productOptions.find((p) => p.name === selectedProduct)?.currentStock ?? 0;

  const added = Number(quantityToAdd) || 0;
  const newStock = current + added;

  const handleSave = async () => {
    setSaving(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSaving(false);

    const params = new URLSearchParams({
      added: "restock",
      product: selectedProduct,
      units: quantityToAdd,
    });

    router.push(`/products?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ================= SIDEBAR ================= */}
      <KassaSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ================= MAIN CONTENT ================= */}
      <main className="min-h-screen lg:ml-[198px] p-4 sm:p-6 lg:p-8">
        {/* ================= HEADER ================= */}
        <div className="flex items-center gap-3 mb-1">
          {/* Mobile / Tablet Hamburger */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex lg:hidden items-center justify-center rounded-md p-1.5 text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu size={23} />
          </button>

          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Products &amp; Inventory
          </h1>
        </div>

        <p className="text-xs sm:text-sm text-gray-400 mb-4">
          Products &amp; Inventory / Low Stock / Restock
        </p>

        <p className="text-sm sm:text-base text-gray-500 mb-6">
          Update inventory quantities for products that are running low.
        </p>

        {/* ================= CONTENT GRID ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* ================= FORM ================= */}
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-4 sm:p-5 md:p-6">
            <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-1">
              Restock inventory
            </h2>

            <p className="text-sm text-gray-500 mb-5">
              Select an existing product and enter the quantity received.
            </p>

            <div className="space-y-5">
              {/* PRODUCT */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Product <span className="text-red-500">*</span>
                </label>

                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                >
                  {productOptions.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* CURRENT STOCK + QUANTITY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Current stock
                  </label>

                  <input
                    value={`${current} units`}
                    disabled
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Quantity to add{" "}
                    <span className="text-red-500">*</span>
                  </label>

                  <input
                    value={quantityToAdd}
                    onChange={(e) =>
                      setQuantityToAdd(
                        e.target.value.replace(/[^0-9]/g, "")
                      )
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-emerald-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              {/* STOCK AFTER RESTOCK */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    Stock after restock
                  </p>

                  <p className="text-2xl font-semibold text-emerald-700">
                    {newStock} units
                  </p>
                </div>

                <p className="text-sm text-gray-500">
                  {current} current + {added} added
                </p>
              </div>

              {/* SUPPLIER / REFERENCE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Supplier / reference
                </label>

                <input
                  value={supplierRef}
                  onChange={(e) => setSupplierRef(e.target.value)}
                  placeholder="Optional purchase or delivery reference"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* NOTE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Note
                </label>

                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note about this stock update"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            {/* ================= ACTION BUTTONS ================= */}
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-6 pt-2">
              <Link
                href="/products"
                className="text-center px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium transition-colors disabled:opacity-70"
              >
                {saving && (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                )}

                {saving ? "Restocking..." : "Restock Product"}
              </button>
            </div>
          </div>

          {/* ================= RIGHT SIDEBAR ================= */}
          <div className="space-y-4">
            {/* RESTOCK SUMMARY */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 md:p-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
                Restock summary
              </h3>

              <div className="space-y-4 border-t border-gray-100 pt-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    Product
                  </p>

                  <p className="text-sm font-semibold text-gray-900">
                    {selectedProduct}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    Current stock
                  </p>

                  <p className="text-sm font-semibold text-gray-900">
                    {current} units
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    Adding
                  </p>

                  <p className="text-sm font-semibold text-emerald-700">
                    +{added} units
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    New stock
                  </p>

                  <p className="text-sm font-semibold text-gray-900">
                    {newStock} units
                  </p>
                </div>
              </div>
            </div>

            {/* WHAT HAPPENS NEXT */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 md:p-6">
              <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-3">
                What happens next
              </h3>

              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Inventory quantity is increased</li>
                <li>• Low-stock status is updated</li>
                <li>• The stock update is recorded</li>
                <li>• Product remains in your catalogue</li>
              </ul>
            </div>

            {/* INVENTORY TIP */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 md:p-5">
              <p className="text-sm font-semibold text-amber-800 mb-1">
                Inventory tip
              </p>

              <p className="text-sm text-amber-700">
                Restocking updates the existing product quantity. It does
                not create a new product.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

