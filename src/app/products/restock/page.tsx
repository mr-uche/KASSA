"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import KassaSidebar from "@/components/KassaSidebar";
import { Loader2, Menu,Bell } from "lucide-react";
import { getInventoryContext, getInventoryProducts, kassaPost, type InventoryContext, type InventoryProduct } from "@/lib/inventory-client";

export default function RestockProductPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState("");
  const [productOptions, setProductOptions] = useState<InventoryProduct[]>([]);
  const [inventoryContext, setInventoryContext] = useState<InventoryContext | null>(null);
  const [selectedProduct, setSelectedProduct] = useState("");

  const [quantityToAdd, setQuantityToAdd] = useState("50");
  const [supplierRef, setSupplierRef] = useState("");
  const [note, setNote] = useState("");

  const activeProduct = productOptions.find((p) => p.id === selectedProduct);
  const current = activeProduct?.stock ?? 0;

  const added = Number(quantityToAdd) || 0;
  const newStock = current + added;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const context = await getInventoryContext();
        const data = await getInventoryProducts(context);
        if (cancelled) return;
        setInventoryContext(context);
        setProductOptions(data);
        setSelectedBranch(context.branchName);
        const requestedId = new URLSearchParams(window.location.search).get("productId");
        setSelectedProduct(data.find((product) => product.id === requestedId)?.id ?? data[0]?.id ?? "");
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load products.");
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (saving) return;
    const quantity = Number(quantityToAdd);
    if (!inventoryContext || !activeProduct)
      return setError("Select a product in an active branch first.");
    if (!/^\d+$/.test(quantityToAdd) || !Number.isSafeInteger(quantity) ||
        quantity < 1 || quantity > 100000000)
      return setError("Quantity to add must be a whole number between 1 and 100,000,000.");
    setError("");
    setSaving(true);
    try {
      const result = await kassaPost<{ stock: number; status: InventoryProduct["status"]; added: number }>(`/api/inventory/products/${activeProduct.id}/restock`, {
        businessId: inventoryContext.businessId, branchId: inventoryContext.branchId,
        quantity, supplierRef: supplierRef.trim() || undefined, note: note.trim() || undefined,
      });
      const params = new URLSearchParams({
        added: "restock",
        product: activeProduct.name,
        units: String(result.added),
        stock: String(result.stock),
        status: result.status,
      });
      router.push(`/products?${params.toString()}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to restock this product.");
    } finally { setSaving(false); }
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
      {/* ================= SIDEBAR ================= */}
      <KassaSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ================= MAIN CONTENT ================= */}
      <main className="min-h-screen lg:ml-[198px] ">
        <header className="flex min-h-[80px] items-center justify-between gap-4 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(true)}
              className="shrink-0 rounded-md p-1.5 text-[#374151] transition hover:bg-[#F3F4F6] lg:hidden"
              aria-label="Open menu">
              <Menu size={22} />
            </button>
            <h1 className="truncate text-[18px] font-bold text-[#182033] sm:text-[20px] lg:text-[21px]">
              Products &amp; Inventory
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-5">
            <div className="hidden w-[130px] sm:block sm:w-[150px] lg:w-[162px]">
              <div className="flex h-[34px] w-full items-center justify-between rounded-[9px] border border-[#D8DCE3] bg-white px-3 text-[12px] text-[#374151] sm:text-[13px]">
                <span className="truncate">{selectedBranch}</span>
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

        <p className="mb-6 px-4 pt-6 text-sm text-gray-500 sm:px-6 sm:pt-8 sm:text-base lg:px-8 lg:pt-12">
          Update inventory quantities for products that are running low.
        </p>

        {/* ================= CONTENT GRID ================= */}
        <div className="grid grid-cols-1 gap-6 px-4 pb-8 sm:px-6 lg:grid-cols-3 lg:px-8 lg:pb-10">
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
                  {productOptions.length === 0 && <option value="">No products yet</option>}
                  {productOptions.map((p) => (
                    <option key={p.id} value={p.id}>
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

            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
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
                disabled={saving || !activeProduct}
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
                    {activeProduct?.name ?? "No product selected"}
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

