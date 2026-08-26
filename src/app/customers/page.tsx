"use client";

import { useState } from "react";
import { Search, ChevronDown, Download, MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import KassaSidebar from "@/components/KassaSidebar";

type Customer = {
  name: string;
  phone: string;
  email: string;
  purchases: number;
  lastPurchase: string;
  status: "Active" | "Inactive";
};

const customers: Customer[] = [
  { name: "Mary Adeyemi", phone: "0803 421 7782", email: "mary.adeyemi@email.com", purchases: 24, lastPurchase: "Today, 9:14 AM", status: "Active" },
  { name: "Chuka Nwosu", phone: "0814 552 1093", email: "chuka.nwosu@email.com", purchases: 17, lastPurchase: "Yesterday, 4:26 PM", status: "Active" },
  { name: "Grace Umeh", phone: "0806 218 4501", email: "grace.umeh@email.com", purchases: 12, lastPurchase: "Aug 18, 11:52 AM", status: "Active" },
];

export default function CustomersPage() {
  const [query, setQuery] = useState("");

  const filtered = customers.filter((c) =>
    `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar />

      <main className="ml-[198px] p-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
        </div>

        <div className="flex items-center justify-between mb-6 mt-2">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Manage customers</h2>
            <p className="text-gray-500">View, search and manage your customer records.</p>
          </div>
          <Link
            href="/customers/add"
            className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add customer
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-2">Total customers</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-gray-900">1,248</p>
              <span className="text-xs text-emerald-600">↑ 8.4% this month</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-2">Active customers</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-gray-900">936</p>
              <span className="text-xs text-gray-400">75% of total records</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-2">New this month</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-gray-900">86</p>
              <span className="text-xs text-emerald-600">↑ 14 from last month</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-2">Customers with purchases</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-gray-900">782</p>
              <span className="text-xs text-gray-400">Last 30 days</span>
            </div>
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, phone or email"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>
          <button className="flex items-center gap-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50">
            All customers <ChevronDown size={14} />
          </button>
          <button className="flex items-center gap-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50">
            All branches <ChevronDown size={14} />
          </button>
          <button className="flex items-center gap-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50">
            Newest first <ChevronDown size={14} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm text-emerald-700 font-medium hover:text-emerald-800">
            <Download size={16} />
            Export
          </button>
        </div>

        {/* Customers table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Purchases</th>
                <th className="px-6 py-4 font-medium">Last Purchase</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.email} className="border-b border-gray-50 last:border-0">
                  <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                  <td className="px-6 py-4 text-gray-700">{c.phone}</td>
                  <td className="px-6 py-4 text-gray-700">{c.email}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{c.purchases}</td>
                  <td className="px-6 py-4 text-gray-500">{c.lastPurchase}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}