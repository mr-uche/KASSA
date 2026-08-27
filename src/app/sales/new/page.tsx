"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ScanBarcode, Minus, Plus } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";

type Product = {
  name: string;
  sku: string;
  stock: number;
  price: number;
  category: string;
  color: string;
};

const products: Product[] = [
  { name: "Panadol Extra", sku: "PAN-001", stock: 42, price: 2400, category: "Medicines", color: "bg-red-100" },
  { name: "Vitamin C 1000mg", sku: "VIT-014", stock: 18, price: 5800, category: "Supplements", color: "bg-orange-100" },
  { name: "Amoxicillin 500mg", sku: "AMX-001", stock: 27, price: 3500, category: "Medicines", color: "bg-blue-100" },
  { name: "Cough Syrup", sku: "COU-005", stock: 31, price: 2900, category: "Medicines", color: "bg-amber-100" },
];

const filterTabs = ["All", "Medicines", "Personal care", "Supplements"] as const;

type SaleItem = { name: string; price: number; qty: number };

export default function NewSalePage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<(typeof filterTabs)[number]>("All");
  const [query, setQuery] = useState("");
  const [sale, setSale] = useState<SaleItem[]>([
    { name: "Panadol Extra", price: 2400, qty: 2 },
    { name: "Vitamin C 1000mg", price: 5800, qty: 1 },
  ]);
  const [paymentMethod, setPaymentMethod] = useState("Transfer");

  const filtered = products.filter(
    (p) =>
      (activeFilter === "All" || p.category === activeFilter) &&
      p.name.toLowerCase().includes(query.toLowerCase())
  );

  const addToSale = (product: Product) => {
    setSale((prev) => {
      const existing = prev.find((i) => i.name === product.name);
      if (existing) {
        return prev.map((i) => (i.name === product.name ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { name: product.name, price: product.price, qty: 1 }];
    });
  };

  const updateQty = (name: string, delta: number) => {
    setSale((prev) =>
      prev
        .map((i) => (i.name === name ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const subtotal = sale.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discount = 0;
  const total = subtotal - discount;

  const handleContinue = () => {
    const params = new URLSearchParams({
      total: String(total),
      subtotal: String(subtotal),
      discount: String(discount),
      method: paymentMethod,
      items: encodeURIComponent(JSON.stringify(sale)),
    });
    router.push(`/sales/checkout?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar />

      <main className="ml-[198px] p-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-semibold text-gray-900">New sale</h1>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700">
            Main branch
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-6">
          Sales / <span className="bg-yellow-100 px-1 rounded">New sale</span>
        </p>

        <div className="grid grid-cols-3 gap-6">
          {/* Add products */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Add products</h2>
            <p className="text-sm text-gray-500 mb-4">
              Search or scan products to build the customer&apos;s order.
            </p>

            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search product, SKU or barcode"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium transition-colors">
                <ScanBarcode size={16} />
                Scan
              </button>
            </div>

            <div className="flex gap-2 mb-5">
              {filterTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeFilter === tab
                      ? "bg-emerald-800 text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {filtered.map((p) => (
                <div key={p.sku} className="border border-gray-200 rounded-lg p-3 flex gap-3">
                  <div className={`w-12 h-12 rounded-md ${p.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">
                      SKU: {p.sku} · Stock: {p.stock}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-semibold text-gray-900 text-sm">
                        ₦{p.price.toLocaleString()}
                      </span>
                      <button
                        onClick={() => addToSale(p)}
                        className="px-3 py-1 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
              <p className="text-xs font-semibold text-amber-800 mb-1">TIP</p>
              <p className="text-sm text-amber-700">
                Use the barcode scanner for faster checkout and automatic stock updates.
              </p>
            </div>
          </div>

          {/* Current sale */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-fit">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Current sale</h2>
            <p className="text-sm text-gray-500 mb-5">
              Transaction will be linked to Ifeoma Bassey.
            </p>

            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Customer
            </p>
            <select className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white mb-5 focus:outline-none focus:ring-2 focus:ring-emerald-700">
              <option>Walk-in customer</option>
              <option>Mary Adeyemi</option>
              <option>Chuka Nwosu</option>
            </select>

            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Items ({sale.length})
            </p>
            <div className="space-y-3 mb-4">
              {sale.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      ₦{item.price.toLocaleString()} × {item.qty}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.name, -1)}
                      className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-sm w-4 text-center">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.name, 1)}
                      className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {sale.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No items added yet.</p>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">₦{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-gray-900">₦{discount}</span>
              </div>
              <div className="flex justify-between font-semibold pt-1">
                <span className="text-gray-900">Total</span>
                <span className="text-emerald-700 text-lg">₦{total.toLocaleString()}</span>
              </div>
            </div>

            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Payment method
            </p>
            <div className="grid grid-cols-4 gap-2 mb-5">
              {["Transfer", "POS", "Cash", "USSD / Card"].map((method) => (
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
              onClick={handleContinue}
              disabled={sale.length === 0}
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