"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  ChevronDown,
  Menu,
  Plus,
  ScanBarcode,
  Users,
} from "lucide-react";

import KassaSidebar from "@/components/KassaSidebar";
import { getInventoryContext, formatNaira } from "@/lib/inventory-client";
import { listSales, saleStatusLabel, type SavedSale } from "@/lib/sales-client";
import { hasBusinessAccess, selectedBusiness, type BusinessAccess } from "@/lib/kassa-permissions";

type MerchantBranch = { id: string; name: string; isActive: boolean };
type MerchantBusiness = BusinessAccess;

const channelLabels: Record<string, string> = {
  CASH: "Cash", BANK_TRANSFER: "Transfer", POS: "POS", CARD: "Card", USSD: "USSD", WALLET: "Wallet",
};

function StatusBadge({ status }: { status: string }) {
  const styles = {
    Success: "bg-[#E8F3DC] text-[#32651C]",
    Failed: "bg-[#FCE5E5] text-[#A42626]",
    Pending: "bg-[#FCEED8] text-[#8A4F05]",
    Cancelled: "bg-gray-100 text-gray-600",
    Refunded: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold ${
        styles[status as keyof typeof styles] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [branches, setBranches] = useState<MerchantBranch[]>([]);
  const branchRef = useRef<HTMLDivElement>(null);
  const [selectedBranch, setSelectedBranch] = useState("Main branch");
  const [greetingName, setGreetingName] = useState("there");
  const [sales, setSales] = useState<SavedSale[]>([]);
  const [salesError, setSalesError] = useState("");
  const [canViewSales, setCanViewSales] = useState<boolean | null>(null);
  const [canManageCustomers, setCanManageCustomers] = useState(false);
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((profile: { fullName?: string } | null) => {
        if (profile?.fullName) setGreetingName(profile.fullName.split(" ")[0]);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    let cancelled = false;
    async function loadBranches() {
      try {
        const response = await fetch("/api/businesses/mine", { cache: "no-store" });
        if (!response.ok) return;
        const data: unknown = await response.json();
        if (!Array.isArray(data)) return;
        const memberships = data as MerchantBusiness[];
        const selectedId = localStorage.getItem("selectedBranchId") ?? "";
        const current = selectedBusiness(memberships, selectedId);
        if (!current) return;
        const activeBranches = (current.branches ?? []).filter((branch) => branch.isActive);
        if (cancelled) return;
        setCanViewSales(hasBusinessAccess(current, "Manage sales & transactions"));
        setCanManageCustomers(hasBusinessAccess(current, "Manage customers"));
        if (cancelled) return;
        setBranches(activeBranches);
        if (!activeBranches.length) {
          setSelectedBranch("No active branches");
          return;
        }
        const savedId = localStorage.getItem("selectedBranchId");
        const savedName = localStorage.getItem("selectedBranch")?.trim().toLowerCase();
        const branch = activeBranches.find((item) => item.id === savedId)
          ?? activeBranches.find((item) => item.name.trim().toLowerCase() === savedName)
          ?? activeBranches[0];
        setSelectedBranch(branch.name);
        localStorage.setItem("selectedBranchId", branch.id);
        localStorage.setItem("selectedBranch", branch.name);
      } catch {
        // Inventory shows an API error if the session has expired.
      }
    }
    void loadBranches();
    window.addEventListener("branchChanged", loadBranches);
    return () => {
      cancelled = true;
      window.removeEventListener("branchChanged", loadBranches);
    };
  }, []);

  useEffect(() => {
    if (canViewSales !== true) {
      setSales([]);
      setSalesError("");
      return;
    }
    let requestNumber = 0;
    let live = true;
    async function loadSales() {
      const sequence = ++requestNumber;
      try {
        const context = await getInventoryContext();
        const data = await listSales(context);
        if (!live || sequence !== requestNumber) return;
        setSales(data);
        setSalesError("");
      } catch (cause) {
        if (!live || sequence !== requestNumber) return;
        setSales([]);
        setSalesError(cause instanceof Error ? cause.message : "Unable to load recent sales.");
      }
    }
    void loadSales();
    window.addEventListener("branchChanged", loadSales);
    return () => {
      live = false;
      window.removeEventListener("branchChanged", loadSales);
    };
  }, [canViewSales]);

  const today = new Date().toDateString();
  const salesToday = sales
    .filter((sale) => sale.status === "PAID" && new Date(sale.createdAt).toDateString() === today)
    .reduce((sum, sale) => sum + Number(sale.total), 0);
  const failedPayments = sales.filter((sale) => sale.payments.some((p) => p.status === "FAILED")).length;
  const transactions = sales.slice(0, 6).map((sale) => ({
    id: sale.id,
    customer: sale.customer,
    cashier: sale.cashier,
    channel: channelLabels[sale.payments[0]?.channel ?? ""] ?? "Unknown",
    amount: formatNaira(sale.total),
    status: saleStatusLabel(sale.status),
    time: new Date(sale.createdAt).toLocaleString("en-NG"),
  }));

  // Close the dropdown when clicking outside it or pressing Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (branchRef.current && !branchRef.current.contains(e.target as Node)) {
        setBranchOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setBranchOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F5F6F8]">
      <KassaSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main area */}
      <main className="min-h-screen lg:ml-[198px]">
        {/* Header */}
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

            <h1 className="truncate text-[15px] font-bold text-[#182033] sm:text-[10px] lg:text-[21px]">
              Good morning, {greetingName}
            </h1>
          </div>

          {/* Header actions */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-5">
            {/* Branch selector */}
            <div
             ref={branchRef}
              className="relative hidden w-[130px] sm:block sm:w-[150px] lg:w-[162px]"
            >
              <button
                type="button"
                onClick={() => setBranchOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={branchOpen}
                className="flex h-[34px] w-full items-center justify-between rounded-[9px] border border-[#D8DCE3] bg-white px-3 text-[12px] text-[#374151] transition hover:bg-[#F8FAFA] sm:text-[13px]"
              >
                <span className="truncate">{selectedBranch}</span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-[#687386] transition-transform ${
                    branchOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {branchOpen && (
                <ul
                  role="listbox"
                  className="absolute right-0 top-full z-30 mt-2 w-full min-w-[162px] overflow-hidden rounded-[9px] border border-[#E0E3E8] bg-white py-1 shadow-lg"
                >
                  {branches.map((branch) => {
                    const active = branch.name === selectedBranch;

                    return (
                      <li key={branch.id} role="option" aria-selected={active}>
                        <button
                          type="button"
                         onClick={() => {
                           setSelectedBranch(branch.name);
                           localStorage.setItem("selectedBranch", branch.name);
                           localStorage.setItem("selectedBranchId", branch.id);
                            window.dispatchEvent(new Event("branchChanged"));
                            setBranchOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition hover:bg-[#F3F6F5] ${
                            active
                              ? "font-semibold text-[#08745F]"
                              : "text-[#374151]"
                          }`}
                        >
                          <span className="truncate">{branch.name}</span>
                          {active && <Check size={15} className="shrink-0" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
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

        {/* Content */}
        <section className="w-full px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10 lg:pt-12">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard
              title="Total sales today"
              value={canViewSales ? formatNaira(salesToday) : "Restricted"}
              subtitle={canViewSales ? "Confirmed paid sales today" : "Sales permission required"}
              subtitleClass="text-[#4D7C27]"
            />

            <StatCard
              title="Recent transactions"
              value={canViewSales ? String(sales.length) : "Restricted"}
              subtitle={canViewSales ? "Latest 100 sales" : "Sales permission required"}
              subtitleClass="text-[#4D7C27]"
            />

            <StatCard
              title="Failed payments"
              value={canViewSales ? String(failedPayments) : "Restricted"}
              subtitle={canViewSales ? "Recorded failures" : "Sales permission required"}
              valueClass="text-[#B82E2E]"
              subtitleClass="text-[#C73737]"
            />

            <StatCard
              title="Branches active"
              value={String(branches.length)}
              subtitle="Authorised active branches"
              subtitleClass="text-[#70798A]"
            />
          </div>

          {/* Quick actions */}
          <div className="mt-7">
            <h2 className="mb-3 text-[15px] font-bold text-[#182033]">
              Quick actions
            </h2>

           <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {/* New sale */}
              {canViewSales && <Link
                href="/sales/new"
                className="flex h-[72px] w-full flex-col items-center justify-center rounded-[9px] bg-[#08745F] text-white shadow-sm transition hover:bg-[#075F50]"
              >
                <div className="flex items-center gap-2 text-[14px] font-semibold">
                  <Plus size={17} />
                  New sale
                </div>

                <span className="mt-1 text-[11px] text-white/90">
                  Start checkout
                </span>
              </Link>}

              {/* Scan product */}
              {canViewSales && <Link
                href="/scan"
                className="flex h-[72px] w-full flex-col items-center justify-center rounded-[9px] border border-[#D2D7DE] bg-white text-[#182033] transition hover:bg-[#F8FAFA] sm:w-auto sm:min-w-[164px]"
              >
                <div className="flex items-center gap-2 text-[14px] font-semibold">
                  <ScanBarcode size={17} />
                  Scan product
                </div>

                <span className="mt-1 text-[11px] text-[#70798A]">
                  Barcode lookup
                </span>
              </Link>}

              {/* Customers */}
              {canManageCustomers && <Link
                href="/customers"
                className="flex h-[72px] w-full flex-col items-center justify-center rounded-[9px] border border-[#D2D7DE] bg-white text-[#182033] transition hover:bg-[#F8FAFA] sm:w-auto sm:min-w-[164px]"
              >
                <div className="flex items-center gap-2 text-[14px] font-semibold">
                  <Users size={17} />
                  Customers
                </div>

                <span className="mt-1 text-[11px] text-[#70798A]">
                  Manage records
                </span>
              </Link>}
              {canViewSales === false && !canManageCustomers && (
                <p className="col-span-full text-sm text-gray-500">No quick actions are assigned to this role.</p>
              )}
            </div>
          </div>

          {salesError && <p role="alert" className="mt-5 text-sm text-red-700">{salesError}</p>}
          {/* Recent Transactions */}
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="text-[15px] font-bold text-[#182033]">
                Recent Transactions
              </h2>

              {canViewSales && (
                <Link
                  href="/transactions"
                  className="shrink-0 text-[13px] font-semibold text-[#08745F] hover:underline"
                >
                  View all
                </Link>
              )}
            </div>

            {/* Responsive table wrapper */}
            <div className="w-full overflow-x-auto rounded-[12px] border border-[#E0E3E8] bg-white">
              <table className="w-full min-w-[800px] border-collapse">
                <thead>
                  <tr className="h-[47px] border-b border-[#E5E7EB]">
                    <th className="whitespace-nowrap px-4 text-left text-[11px] font-semibold text-[#687386] sm:px-6">
                      CUSTOMER
                    </th>

                    <th className="whitespace-nowrap px-4 text-left text-[11px] font-semibold text-[#687386] sm:px-6">
                      CASHIER
                    </th>

                    <th className="whitespace-nowrap px-4 text-left text-[11px] font-semibold text-[#687386] sm:px-6">
                      CHANNEL
                    </th>

                    <th className="whitespace-nowrap px-4 text-left text-[11px] font-semibold text-[#687386] sm:px-6">
                      AMOUNT
                    </th>

                    <th className="whitespace-nowrap px-4 text-left text-[11px] font-semibold text-[#687386] sm:px-6">
                      STATUS
                    </th>

                    <th className="whitespace-nowrap px-4 text-left text-[11px] font-semibold text-[#687386] sm:px-6">
                      TIME
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="h-[52px] border-b border-[#EEF0F3] last:border-0 hover:bg-[#FAFBFB]"
                    >
                      <td className="whitespace-nowrap px-4 text-[13px] text-[#354052] sm:px-6">
                        {transaction.customer}
                      </td>

                      <td className="whitespace-nowrap px-4 text-[13px] text-[#536074] sm:px-6">
                        {transaction.cashier}
                      </td>

                      <td className="whitespace-nowrap px-4 text-[13px] text-[#536074] sm:px-6">
                        {transaction.channel}
                      </td>

                      <td className="whitespace-nowrap px-4 text-[13px] font-bold text-[#182033] sm:px-6">
                        {transaction.amount}
                      </td>

                      <td className="px-4 sm:px-6">
                        <StatusBadge status={transaction.status} />
                      </td>

                      <td className="whitespace-nowrap px-4 text-[13px] text-[#687386] sm:px-6">
                        {transaction.time}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                      {canViewSales === false ? "Recent transactions require sales permission." : "No recent sales yet."}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile table hint */}
            <p className="mt-2 text-[11px] text-[#8A93A2] sm:hidden">
              ← Swipe horizontally to view all transaction details →
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  valueClass = "",
  subtitleClass = "",
}: {
  title: string;
  value: string;
  subtitle: string;
  valueClass?: string;
  subtitleClass?: string;
}) {
  return (
    <div className="min-h-[113px] rounded-[12px] border border-[#DFE3E8] bg-white px-5 py-5 sm:px-6">
      <p className="text-[13px] text-[#70798A]">{title}</p>

      <p
        className={`mt-[3px] text-[25px] font-bold tracking-[-0.5px] text-[#182033] sm:text-[27px] ${valueClass}`}
      >
        {value}
      </p>

      <p className={`mt-0 text-[12px] ${subtitleClass}`}>{subtitle}</p>
    </div>
  );
}