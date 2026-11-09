"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronDown, Download, MoreHorizontal, Plus, CheckCircle2, X, Menu, Bell } from "lucide-react";
import Link from "next/link";
import KassaSidebar from "@/components/KassaSidebar";
import { getCustomerBusiness, listCustomers, type CustomerRecord } from "@/lib/customers-client";

function FilterDropdown({
  selected, options, onSelect,
}: { selected: string; options: string[]; onSelect: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative z-30 shrink-0">
      <button type="button" onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center gap-1 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
        {selected} <ChevronDown size={14} className={open ? "rotate-180" : ""}/>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-48 max-w-[calc(100vw-3rem)] rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
          {options.map((option) => (
            <button key={option} type="button" onClick={() => { onSelect(option); setOpen(false); }}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomersPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState("All Customers");
  const [selectedSort, setSelectedSort] = useState("Newest first");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState("");

  useEffect(() => {
    const action = params.get("added") === "true" ? "added" :
      params.get("updated") === "true" ? "updated" : null;
    if (action) {
      setToastText(action === "added" ? "Customer added successfully" : "Customer updated successfully");
      setShowToast(true);
      router.replace("/customers");
    }
  }, [params, router]);

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), 4000);
    return () => clearTimeout(timer);
  }, [showToast]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const { businessId } = await getCustomerBusiness();
        const records = await listCustomers(businessId);
        if (!active) return;
        setCustomers(records);
        setError("");
      } catch (cause) {
        if (!active) return;
        setCustomers([]);
        setError(cause instanceof Error ? cause.message : "Unable to load customer records.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const now = new Date();
  const filtered = customers
    .filter((customer) => {
      const text = query.trim().toLowerCase();
      const matchesSearch = (
        customer.fullName + " " + (customer.phone ?? "") + " " + (customer.email ?? "")
      ).toLowerCase().includes(text);
      const matchesType = selectedCustomers === "All Customers" ||
        (selectedCustomers === "With purchases" && customer.purchases > 0) ||
        (selectedCustomers === "No purchases" && customer.purchases === 0);
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (selectedSort === "Oldest first") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (selectedSort === "Most purchases") return b.purchases - a.purchases;
      if (selectedSort === "Recently purchased") return (b.lastPurchase ? Date.parse(b.lastPurchase) : 0) - (a.lastPurchase ? Date.parse(a.lastPurchase) : 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const withPurchases = customers.filter((customer) => customer.purchases > 0).length;
  const joinedThisMonth = customers.filter((customer) => {
    const date = new Date(customer.createdAt);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;
  const boughtLast30 = customers.filter((customer) =>
    customer.lastPurchase && new Date(customer.lastPurchase).getTime() >= now.getTime() - 30 * 86400000,
  ).length;

  function exportCustomers() {
    if (!filtered.length) return;
    const rows = [
      ["Name", "Phone", "Email", "Purchases", "Last purchase", "Created at", "Address", "Notes"],
      ...filtered.map((customer) => [
        customer.fullName, customer.phone ?? "", customer.email ?? "", String(customer.purchases),
        customer.lastPurchase ?? "", customer.createdAt, customer.address ?? "", customer.notes ?? "",
      ]),
    ];
    const quote = (value: string) => {
      const safe = /^[=+@-]/.test(value) ? "'" + value : value;
      return '"' + safe.replaceAll('"', '""') + '"';
    };
    const csv = rows.map((row) => row.map(quote).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "kassa-customers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-h-screen lg:ml-[198px]">
        <header className="flex min-h-[80px] items-center justify-between gap-4 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(true)}
              className="shrink-0 rounded-md p-1.5 text-[#374151] transition hover:bg-[#F3F4F6] lg:hidden"
              aria-label="Open menu"><Menu size={22}/></button>
            <h1 className="truncate text-[18px] font-bold text-[#182033] sm:text-[20px] lg:text-[21px]">
              Customers
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <div className="hidden w-[130px] sm:block sm:w-[150px] lg:w-[162px]">
              <div className="flex h-[34px] w-full items-center rounded-[9px] border border-[#D8DCE3] bg-white px-3 text-[12px] text-[#374151]">
                <span className="truncate">All branches</span>
              </div>
            </div>
            <button type="button" aria-label="Notifications"
              className="relative flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#F8F9FA]">
              <Bell size={17} className="text-[#98A1AE]"/>
            </button>
            <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#E5F5F0] text-[12px] font-semibold text-[#08745F]">
              AO
            </div>
          </div>
        </header>

        <div className="mb-6 mt-4 flex flex-col gap-4 px-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="mb-1 text-lg font-semibold text-gray-900 sm:text-xl">Manage customers</h2>
            <p className="text-sm text-gray-500 sm:text-base">View, search and manage your business-wide customer records.</p>
          </div>
          <Link href="/customers/add"
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-900">
            <Plus size={16}/> Add customer
          </Link>
        </div>

        {error && <p role="alert" className="mb-4 px-8 text-sm text-red-700">{error}</p>}
        {loading && <p role="status" className="mb-4 px-8 text-sm text-gray-500">Loading customers...</p>}

        <div className="mb-6 grid grid-cols-2 gap-4 px-8 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <p className="mb-2 text-sm text-gray-500">Total customers</p>
            <p className="text-xl font-semibold text-gray-900 sm:text-2xl">{customers.length}</p>
            <span className="text-xs text-gray-400">Saved customer records</span>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <p className="mb-2 text-sm text-gray-500">Returning customers</p>
            <p className="text-xl font-semibold text-gray-900 sm:text-2xl">{withPurchases}</p>
            <span className="text-xs text-gray-400">Linked to confirmed sales</span>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <p className="mb-2 text-sm text-gray-500">New this month</p>
            <p className="text-xl font-semibold text-gray-900 sm:text-2xl">{joinedThisMonth}</p>
            <span className="text-xs text-gray-400">Customers created this month</span>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <p className="mb-2 text-sm text-gray-500">Customers with purchases</p>
            <p className="text-xl font-semibold text-gray-900 sm:text-2xl">{boughtLast30}</p>
            <span className="text-xs text-gray-400">Last 30 days</span>
          </div>
        </div>

        <div className="relative z-20 mb-4 flex flex-col gap-3 px-4 sm:px-8 lg:flex-row lg:flex-wrap">
          <div className="relative w-full min-w-0 lg:min-w-[210px] lg:flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, phone or email"
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"/>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">
            <FilterDropdown selected={selectedCustomers}
              options={["All Customers", "With purchases", "No purchases"]}
              onSelect={setSelectedCustomers}/>
            <span className="shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600">
              All branches
            </span>
            <FilterDropdown selected={selectedSort}
              options={["Newest first", "Oldest first", "Most purchases", "Recently purchased"]}
              onSelect={setSelectedSort}/>
            <button type="button" disabled={!filtered.length || loading} onClick={exportCustomers}
              className="flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-50">
              <Download size={16}/> Export
            </button>
          </div>
        </div>

        <div className="mx-8 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
              <th className="whitespace-nowrap px-6 py-4 font-medium">Customer</th>
              <th className="whitespace-nowrap px-6 py-4 font-medium">Phone</th>
              <th className="whitespace-nowrap px-6 py-4 font-medium">Email</th>
              <th className="whitespace-nowrap px-6 py-4 font-medium">Purchases</th>
              <th className="whitespace-nowrap px-6 py-4 font-medium">Last Purchase</th>
              <th className="whitespace-nowrap px-6 py-4 font-medium">Status</th>
              <th className="whitespace-nowrap px-6 py-4 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.id} className="border-b border-gray-50 last:border-0">
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">{customer.fullName}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-700">{customer.phone ?? "—"}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-700">{customer.email ?? "—"}</td>
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">{customer.purchases}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                    {customer.lastPurchase
                      ? new Date(customer.lastPurchase).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
                      : "No purchases yet"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={customer.purchases > 0
                      ? "rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                      : "rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"}>
                      {customer.purchases > 0 ? "Returning" : "New"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link href={"/customers/" + encodeURIComponent(customer.id) + "/edit"}
                      aria-label={"Edit " + customer.fullName} title={"Edit " + customer.fullName}
                      className="inline-flex items-center gap-1 text-gray-500 hover:text-emerald-700">
                      <MoreHorizontal size={18}/> <span className="text-xs">Edit</span>
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                  {error ? "Unable to load customer records." : query ? "No customers match this search." :
                    "No customers found. Add a customer to get started."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {customers.length === 500 && (
          <p className="px-8 pt-3 text-xs text-amber-700">
            Showing the most recent 500 customers. More records require pagination, which will be added later.
          </p>
        )}
      </main>

      {showToast && (
        <div className="fixed bottom-6 right-6 left-6 z-50 flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-lg sm:left-auto sm:max-w-md">
          <CheckCircle2 className="shrink-0 text-[#0F4C3A]" size={20}/>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#182033]">{toastText}</p>
            <p className="text-[12px] text-[#98A1AE]">The customer record has been saved to your business.</p>
          </div>
          <button type="button" onClick={() => setShowToast(false)} aria-label="Dismiss notification">
            <X size={14} className="text-[#98A1AE]"/>
          </button>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  return <Suspense fallback={null}><CustomersPageContent/></Suspense>;
}
