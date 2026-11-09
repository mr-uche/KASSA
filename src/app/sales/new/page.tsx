"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ScanBarcode, Minus, Plus, Menu, Bell } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import Link from "next/link";
import { getInventoryContext, type InventoryContext, type InventoryProduct } from "@/lib/inventory-client";
import { hasBusinessAccess, loadAccess } from "@/lib/kassa-permissions";
import { listCheckoutProducts, type PaymentMethod } from "@/lib/sales-client";
import {
  readScopedCart, writeScopedCart, SCAN_CART_KEY, SALE_CART_KEY,
} from "@/lib/scan-client";
import { listCustomers, type CustomerRecord } from "@/lib/customers-client";

type Product = InventoryProduct;
type SaleItem = { id: string; name: string; price: number; qty: number };

export default function NewSalePage() {
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState("All");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inventoryContext, setInventoryContext] = useState<InventoryContext | null>(null);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [canManageCustomers, setCanManageCustomers] = useState(false);
  const [canManageInventory, setCanManageInventory] = useState(false);

  const [query, setQuery] = useState("");

  const [sale, setSale] = useState<SaleItem[]>([]);
  const [cartReady, setCartReady] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("Transfer");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    async function loadProducts() {
      try {
        const context = await getInventoryContext();
        const memberships = await loadAccess();
        const business = memberships.find((item) => item.id === context.businessId);
        const permittedCustomers = hasBusinessAccess(business, "Manage customers");
        const permittedInventory = hasBusinessAccess(business, "Manage products & inventory");
        // Never require customer-management or cost-price access for a cashier sale.
        // The checkout catalogue contains public selling prices and branch stock only.
        const [productsResult, customerRecords] = await Promise.all([
          listCheckoutProducts(context),
          permittedCustomers ? listCustomers(context.businessId) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setProducts(productsResult);
        setCustomers(customerRecords);
        // Preserve an in-progress sale when the cashier opens the scanner.
        // Merge scanner items by product ID; never combine products from
        // different businesses/branches, and never exceed live branch stock.
        const remembered = readScopedCart(SALE_CART_KEY, context);
        const scanned = readScopedCart(SCAN_CART_KEY, context);
        const quantities = new Map<string, number>();
        for (const item of [...remembered, ...scanned]) {
          quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
        }
        const resumed: SaleItem[] = [];
        for (const product of productsResult) {
          const qty = Math.min(quantities.get(product.id) ?? 0, product.stock);
          if (qty > 0) resumed.push({
            id: product.id, name: product.name, price: Number(product.price), qty,
          });
        }
        setSale(resumed);
        window.sessionStorage.removeItem(SCAN_CART_KEY);
        setCartReady(true);
        setCanManageCustomers(permittedCustomers);
        setCanManageInventory(permittedInventory);
        if (!permittedCustomers) setSelectedCustomerId("");
        setInventoryContext(context);
        setSelectedBranch(context.branchName);
        setError("");
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load products.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadProducts();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!inventoryContext || !cartReady) return;
    writeScopedCart(SALE_CART_KEY, inventoryContext,
      sale.map((item) => ({ productId: item.id, quantity: item.qty })));
  }, [sale, inventoryContext, cartReady]);

  const filterTabs = ["All", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
  const filtered = products.filter((p) =>
    (activeFilter === "All" || p.category === activeFilter) &&
    `${p.name} ${p.sku}`.toLowerCase().includes(query.toLowerCase())
  );

  const addToSale = (product: Product) => {
    if (product.stock < 1) return;
    setSale((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { id: product.id, name: product.name, price: Number(product.price), qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setSale((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const product = products.find((p) => p.id === id);
      return { ...item, qty: Math.max(0, Math.min(product?.stock ?? item.qty, item.qty + delta)) };
    }).filter((item) => item.qty > 0));
  };

  const subtotal = sale.reduce(
    (sum, i) => sum + i.price * i.qty,
    0
  );

  const discount = 0;
  const total = subtotal - discount;

  function handleContinue() {
    if (!inventoryContext || !sale.length) return;
    const channelMap: Record<string, PaymentMethod> = {
      Transfer: "BANK_TRANSFER", POS: "POS", Cash: "CASH", USSD: "USSD", Card: "CARD",
    };
    sessionStorage.setItem("kassa_sale_draft", JSON.stringify({
      businessId: inventoryContext.businessId,
      branchId: inventoryContext.branchId,
      clientRequestId: crypto.randomUUID(),
      channel: channelMap[paymentMethod] ?? "BANK_TRANSFER",
      items: sale.map((item) => ({ productId: item.id, quantity: item.qty })),
      customerId: selectedCustomerId || undefined,
      customerName: customers.find((customer) => customer.id === selectedCustomerId)?.fullName ?? "Walk-in customer",
      previewItems: sale,
    }));
    sessionStorage.removeItem(SALE_CART_KEY);
    sessionStorage.removeItem(SCAN_CART_KEY);
    router.push("/sales/checkout");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <KassaSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="min-h-screen lg:ml-[198px]">

        {/* Mobile header row with menu button */}
        <header className="flex min-h-[80px] items-center justify-between gap-4 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 lg:px-8">

          {/* Hamburger + Greeting */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 rounded-md p-1.5 text-[#374151] transition hover:bg-[#F3F4F6] lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <h1 className=" truncate text-[18px] font-bold text-[#182033] sm:text-[20px] lg:text-[21px]">
             New sale
            </h1>

          </div>

          {/* Header actions */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-5">

            {/* Branch display - no dropdown */}
            <div className="hidden w-[130px] sm:block sm:w-[150px] lg:w-[162px]">
              <div className="flex h-[34px] w-full items-center justify-between rounded-[9px] border border-[#D8DCE3] bg-white px-3 text-[12px] text-[#374151] sm:text-[13px]">
                <span className="truncate">{selectedBranch}</span>
              </div>
            </div>

            {/* Notification */}
            <button
              className="relative flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-[#F8F9FA]"
              type="button"
              aria-label="Notifications"
            >
              <Bell size={17} className="text-[#98A1AE]" />

              <span className="absolute right-[8px] top-[6px] h-[7px] w-[7px] rounded-full bg-[#E54848]" />
            </button>

            {/* Profile */}
            <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-[#E5F5F0] text-[12px] font-semibold text-[#08745F]">
              AO
            </div>
          </div>
          

        </header>

        <p className=" px-[25px] text-sm text-gray-400 mb-6">
              Sales / <span className="bg-yellow-100 px-1 rounded">New sale</span>
        </p>

        <div className="grid min-w-0 grid-cols-1 gap-6 px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:grid-cols-3 lg:px-8 lg:pb-10 lg:pt-12">

          {/* Add products */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 sm:p-6 ">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Add products
            </h2>

            <p className="text-sm text-gray-500 mb-4">
              Search or scan products to build the customer&apos;s order.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">

              <div className="flex-1 relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search product, SKU or barcode"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <Link href="/scan" passHref>
                <button className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium transition-colors shrink-0">
                  <ScanBarcode size={16} />
                  Scan
                </button>
              </Link>
            </div>

            <div className="-mx-5 sm:mx-0 flex gap-2 mb-5 overflow-x-auto px-5 sm:px-0">
              {filterTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    activeFilter === tab
                      ? "bg-emerald-800 text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
            {loading && <p className="mb-4 text-sm text-gray-500">Loading products...</p>}
            {!loading && !error && products.length === 0 && (
              <p className="mb-4 rounded-lg border border-gray-200 p-5 text-sm text-gray-500">
                No products have been added yet. {canManageInventory
                  ? <Link href="/products/add" className="font-medium text-emerald-700 underline">Add your first product</Link>
                  : "Ask the inventory manager to add products."}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 ">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="border border-gray-200 rounded-lg p-3 flex gap-3"
                >
                  <div
                    className="w-12 h-12 rounded-md bg-emerald-50 shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {p.name}
                    </p>

                    <p className="text-xs text-gray-500">
                      SKU: {p.sku} · Stock: {p.stock}
                    </p>

                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-semibold text-gray-900 text-sm">
                        ₦{Number(p.price).toLocaleString("en-NG")}
                      </span>

                      <button
                        onClick={() => addToSale(p)}
                        disabled={p.stock === 0 || sale.some((item) => item.id === p.id && item.qty >= p.stock)}
                        className="disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
              <p className="text-xs font-semibold text-amber-800 mb-1">
                TIP
              </p>

              <p className="text-sm text-amber-700">
                All prices are recalculated by the backend. Stock is deducted only after cash receipt or verified payment.
              </p>
            </div>
          </div>

          {/* Current sale */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 h-fit">

            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Current sale
            </h2>

            <p className="text-sm text-gray-500 mb-5">
              Review your order. Payment confirmation happens after the sale is saved.
            </p>

            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Customer
            </p>

            <select value={selectedCustomerId} disabled={!canManageCustomers}
              onChange={(event) => setSelectedCustomerId(event.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white mb-5 focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:opacity-70">
              <option value="">Walk-in customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.fullName}</option>
              ))}
            </select>
            {!canManageCustomers && (
              <p className="-mt-3 mb-4 text-xs text-gray-500">
                Walk-in sale. Customer records require Manage customers permission.
              </p>
            )}

            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Items ({sale.length})
            </p>

            <div className="space-y-3 mb-4">
              {sale.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.name}
                    </p>

                    <p className="text-xs text-gray-500">
                      ₦{item.price.toLocaleString()} × {item.qty}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                    >
                      <Minus size={12} />
                    </button>

                    <span className="text-sm w-4 text-center">
                      {item.qty}
                    </span>

                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {sale.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  No items added yet.
                </p>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2 mb-5">

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">
                  ₦{subtotal.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-gray-900">₦{discount}</span>
              </div>

              <div className="flex justify-between font-semibold pt-1">
                <span className="text-gray-900">Total</span>
                <span className="text-emerald-700 text-lg">
                  ₦{total.toLocaleString()}
                </span>
              </div>

            </div>

            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Payment method
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {["Transfer", "POS", "Cash", "USSD", "Card"].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                    paymentMethod === method
                      ? "border-emerald-700 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleContinue}
              disabled={sale.length === 0 || !inventoryContext || loading}
              className="w-full bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Continue to payment
            </button>

          </div>
        </div>

      </main>
    </div>
  );
}

