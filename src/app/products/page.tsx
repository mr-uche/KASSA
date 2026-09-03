"use client";

import { useState } from "react";
import { Search, Plus, MoreHorizontal, ChevronDown, Menu } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import Link from "next/link";


type Product = {
  name: string;
  sku: string;
  category: string;
  price: string;
  stock: number;
  status: "In stock" | "Low stock" | "Out of stock";
};

const products: Product[] = [
  { name: "Amoxicillin 500mg", sku: "MED-00142", category: "Medicine", price: "₦4,000", stock: 42, status: "In stock" },
  { name: "Vitamin C 1000mg", sku: "SUP-00231", category: "Supplements", price: "₦6,500", stock: 18, status: "In stock" },
  { name: "Paracetamol 500mg", sku: "MED-00098", category: "Medicine", price: "₦1,200", stock: 4, status: "Low stock" },
];

type Category = {
  name: string;
  products: number;
  stockValue: string;
  status: "Active" | "Inactive";
};

const categories: Category[] = [
  { name: "Medicines", products: 64, stockValue: "₦486,500", status: "Active" },
  { name: "Vitamins & supplements", products: 31, stockValue: "₦218,700", status: "Active" },
];

type LowStockProduct = {
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  reorderLevel: number;
  status: "Low stock" | "Out of stock";
};

const lowStockProducts: LowStockProduct[] = [
  { name: "Amoxicillin 500mg", sku: "AMX-500", category: "Medicine", currentStock: 8, reorderLevel: 20, status: "Low stock" },
  { name: "Vitamin C 1000mg", sku: "VIT-1000", category: "Supplements", currentStock: 5, reorderLevel: 15, status: "Low stock" },
];

const tabs = ["Catalogue", "Categories", "Low Stock"] as const;
type Tab = (typeof tabs)[number];

function StatusBadge({ status }: { status: Product["status"] | Category["status"] | LowStockProduct["status"] }) {
  const styles: Record<string, string> = {
    "In stock": "bg-green-100 text-green-700",
    "Low stock": "bg-amber-100 text-amber-700",
    "Out of stock": "bg-red-100 text-red-700",
    Active: "bg-green-100 text-green-700",
    Inactive: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Catalogue");
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filtered = products.filter((p) =>
    `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(query.toLowerCase())
  );

  const totalProducts = products.length;
  const numCategories = new Set(products.map((p) => p.category)).size;
  const lowStock = products.filter((p) => p.status === "Low stock").length;

  const headerButtonLabel =
    activeTab === "Catalogue" ? "Add product" : activeTab === "Categories" ? "Add category" : "Restock product";

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <KassaSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="min-h-screen lg:ml-[198px] p-4 sm:p-6 lg:p-8">
        {/* Mobile header row with menu button */}
        <div className="flex items-center gap-3 mb-1">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="shrink-0 rounded-md p-1.5 text-gray-600 transition hover:bg-gray-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Products & Inventory
          </h1>
        </div>
        <p className="text-gray-500 mb-6 text-sm sm:text-base">
          {activeTab === "Low Stock"
            ? "Monitor products, categories and stock levels"
            : "Manage your catalogue, categories and stock levels."}
        </p>

        {/* Tabs + action */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-6">
          <div className="flex flex-1 bg-white rounded-lg border border-gray-200 p-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 shrink-0 px-3 sm:px-4 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "text-emerald-700 border-b-2 border-emerald-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <Link
            href={
              activeTab === "Catalogue"
                ? "/products/add"
                : activeTab === "Categories"
                ? "/products/categories/add"
                : "/products/restock"
            }
            className="flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0"
          >
            <Plus size={16} />
            {headerButtonLabel}
          </Link>
        </div>

        {/* ---------------- CATALOGUE TAB ---------------- */}
        {activeTab === "Catalogue" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                <p className="text-sm text-gray-500 mb-2">Total products</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">{totalProducts}</p>
                  <span className="text-xs text-emerald-600">+12 this month</span>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                <p className="text-sm text-gray-500 mb-2">Categories</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{numCategories}</p>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                <p className="text-sm text-gray-500 mb-2">Low stock items</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">{lowStock}</p>
                  <span className="text-xs text-red-600">Needs attention</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products by name or code"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <button className="flex shrink-0 items-center gap-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50">
                  All categories <ChevronDown size={14} />
                </button>
                <button className="flex shrink-0 items-center gap-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50">
                  All stock <ChevronDown size={14} />
                </button>
                <button className="flex shrink-0 items-center gap-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50">
                  Sort <ChevronDown size={14} />
                </button>
                <span className="flex shrink-0 items-center px-2 text-sm text-gray-400 whitespace-nowrap">
                  {filtered.length} products
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Product</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Category</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Price</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Stock</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.sku} className="border-b border-gray-50 last:border-0">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-gray-500 text-xs">SKU: {p.sku}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{p.category}</td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{p.price}</td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{p.stock}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreHorizontal size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                        No products found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ---------------- CATEGORIES TAB ---------------- */}
        {activeTab === "Categories" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                <p className="text-sm text-gray-500 mb-2">Total categories</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">12</p>
                  <span className="text-xs text-gray-400">active categories</span>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                <p className="text-sm text-gray-500 mb-2">Products assigned</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">186</p>
                  <span className="text-xs text-gray-400">across categories</span>
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                <p className="text-sm text-gray-500 mb-2">Uncategorised</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">7</p>
                  <span className="text-xs text-amber-600">products need a category</span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex-1 relative max-w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  placeholder="Search categories..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Category</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Products</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Stock value</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.name} className="border-b border-gray-50 last:border-0">
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{c.name}</td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{c.products}</td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{c.stockValue}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                          View ›
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ---------------- LOW STOCK TAB ---------------- */}
        {activeTab === "Low Stock" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                <p className="text-sm text-gray-500 mb-2">Low-stock products</p>
                <p className="text-xl sm:text-2xl font-semibold text-amber-600">12</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                <p className="text-sm text-gray-500 mb-2">Out of stock</p>
                <p className="text-xl sm:text-2xl font-semibold text-red-600">3</p>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                <p className="text-sm text-gray-500 mb-2">Needs attention</p>
                <p className="text-sm sm:text-base font-semibold text-gray-900 mt-1.5">
                  Restock before next sales cycle
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  placeholder="Search low-stock products..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <button className="flex shrink-0 items-center gap-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50">
                  All categories <ChevronDown size={14} />
                </button>
                <button className="flex shrink-0 items-center gap-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50">
                  Stock status <ChevronDown size={14} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Product</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Category</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Current stock</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Reorder level</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((p) => (
                    <tr key={p.sku} className="border-b border-gray-50 last:border-0">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-gray-500 text-xs">SKU {p.sku}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{p.category}</td>
                      <td className="px-6 py-4 font-medium text-amber-600 whitespace-nowrap">{p.currentStock} units</td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{p.reorderLevel} units</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}