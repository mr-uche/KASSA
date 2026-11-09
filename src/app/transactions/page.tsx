"use client";

import { useState ,useEffect} from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
} from "lucide-react";

import KassaSidebar from "@/components/KassaSidebar";
import { getInventoryContext, formatNaira } from "@/lib/inventory-client";
import { listSales, saleStatusLabel, type SavedSale } from "@/lib/sales-client";

type TransactionRow = {
  id: string; reference: string; customer: string; cashier: string;
  channel: string; items: string; amount: string; status: string;
  time: string; createdAt: string; total: number;
};
const channelLabels: Record<string, string> = {
  CASH: "Cash", BANK_TRANSFER: "Transfer", POS: "POS", CARD: "Card",
  USSD: "USSD", WALLET: "Kassa Wallet",
};
function toTransactionRow(sale: SavedSale): TransactionRow {
  const payment = sale.payments[0];
  const status = payment?.status === "FAILED" ? "Failed" : saleStatusLabel(sale.status);
  return {
    id: sale.id, reference: sale.reference, customer: sale.customer,
    cashier: sale.cashier, channel: channelLabels[payment?.channel ?? ""] ?? "Not set",
    items: sale.items.length + (sale.items.length === 1 ? " item" : " items"),
    amount: formatNaira(sale.total), status,
    time: new Date(sale.createdAt).toLocaleString("en-NG"),
    createdAt: sale.createdAt, total: Number(sale.total),
  };
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    Success: "bg-[#E8F3DC] text-[#32651C]",
    Failed: "bg-[#FCE5E5] text-[#A42626]",
    Pending: "bg-[#FCEED8] text-[#8A4F05]",
    Cancelled: "bg-gray-100 text-gray-600",
    Refunded: "bg-gray-100 text-gray-600",
    "Partial refund": "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-[5px] text-[11px] font-semibold ${
        styles[status as keyof typeof styles] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}

function FilterDropdown({
  selected,
  options,
  onSelect,
}: {
  selected: string;
  options: string[];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
 
  return (
    <div className="relative shrink-0">
      <select aria-label="Select transaction filter" value={selected}
        onChange={(event) => onSelect(event.target.value)}
        className="max-w-[170px] shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 sm:hidden">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <div className="hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
      >
        {selected}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
 
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onSelect(option);
                setOpen(false);
              }}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              {option}
            </button>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  valueClass = "text-[#182033]",
}: {
  title: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="min-h-[88px] w-full rounded-[11px] border border-[#DFE3E8] bg-white px-4 py-4 sm:px-[23px] sm:py-[18px]">
      <p className="text-[12px] text-[#70798A]">{title}</p>

      <p
        className={`mt-1 text-[19px] font-bold tracking-[-0.3px] sm:text-[22px] ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

export default function TransactionsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState("All Channels");
  const [selectedStatuses, setSelectedStatuses] = useState("All statuses");
  const [selected7Days, setSelected7Days] = useState("Last 7 days");
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  window.addEventListener("branchChanged", handleBranchChange);

  return () => {
    window.removeEventListener("branchChanged", handleBranchChange);
  };
}, []);

  useEffect(() => {
    let active = true;
    async function loadSales() {
      setLoading(true);
      try {
        const context = await getInventoryContext();
        const sales = await listSales(context);
        if (!active) return;
        setSelectedBranch(context.branchName);
        setTransactions(sales.map(toTransactionRow));
        setError("");
      } catch (cause) {
        if (active) {
          setTransactions([]);
          setError(cause instanceof Error ? cause.message : "Unable to load transactions.");
        }
      } finally { if (active) setLoading(false); }
    }
    void loadSales();
    return () => { active = false; };
  }, []);

  const now = new Date();
  const filteredTransactions = transactions.filter((row) => {
    const search = query.trim().toLowerCase();
    if (search && !(row.reference + " " + row.customer + " " + row.cashier).toLowerCase().includes(search)) return false;
    if (selectedChannels !== "All Channels" && row.channel !== selectedChannels) return false;
    if (selectedStatuses !== "All statuses") {
      const expected = selectedStatuses === "Successful" ? "Success" : selectedStatuses;
      if (row.status !== expected) return false;
    }
    const date = new Date(row.createdAt);
    if (selected7Days === "Last 7 days") return date.getTime() >= now.getTime() - 7 * 86400000;
    if (selected7Days === "Last 30 days") return date.getTime() >= now.getTime() - 30 * 86400000;
    if (selected7Days === "This month") return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    if (selected7Days === "This year") return date.getFullYear() === now.getFullYear();
    return true;
  });
  const successful = filteredTransactions.filter((row) => row.status === "Success");
  const received = successful.reduce((total, row) => total + row.total, 0);
  const pending = filteredTransactions.filter((row) => row.status === "Pending").length;
  const failed = filteredTransactions.filter((row) => row.status === "Failed").length;

  function exportTransactions() {
    const rows = [["Reference", "Customer", "Cashier", "Channel", "Items", "Amount (NGN)", "Status", "Created At"],
      ...filteredTransactions.map((row) => [row.reference, row.customer, row.cashier, row.channel,
        row.items, String(row.total), row.status, row.createdAt])];
    const safe = (value: string) => {
      const text = /^[=+@-]/.test(value) ? "'" + value : value;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    const csv = rows.map((cells) => cells.map(safe).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "kassa-sales.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F5F6F8]">
      <KassaSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="min-h-screen lg:ml-[198px]">
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
              Transactions
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

        {/* Page content */}
        <section className="px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10 lg:pt-12">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-[15px]">
            {/* Search */}
            <div className="relative w-full sm:w-[265px]">
              <Search
                size={19}
                className="absolute left-[13px] top-[11px] text-[#9BA4B3]"
              />

              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search customer or reference"
                className="h-[42px] w-full rounded-[8px] border border-[#D4D9E0] bg-white pl-[40px] pr-[12px] text-[13px] text-[#374151] outline-none placeholder:text-[#9BA4B3] focus:border-[#08745F]"
              />
            </div>

            {/* Filter row: horizontal scroll on mobile instead of wrapping/overflow */}
            <div className="flex min-w-0 max-w-full gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin] sm:flex-wrap sm:gap-[15px] sm:overflow-visible sm:pb-0">
              <FilterDropdown
                selected={selectedChannels}
                options={["All Channels", "Transfer", "Cash", "POS", "USSD", "Card", "Kassa Wallet"]}
                onSelect={setSelectedChannels}
              />

              <FilterDropdown
                selected={selectedStatuses}
                options={["All statuses", "Successful", "Failed", "Pending", "Cancelled", "Refunded"]}
                onSelect={setSelectedStatuses}
              />

              <FilterDropdown
                selected={selected7Days}
                options={["Last 7 days", "Last 30 days", "This month", "This year"]}
                onSelect={setSelected7Days}
              />
            </div>

            <button type="button" onClick={exportTransactions} disabled={loading || !filteredTransactions.length}
              className="h-[42px] w-full rounded-[8px] border border-[#D4D9E0] bg-white px-[17px] text-[13px] font-semibold text-[#394355] disabled:opacity-50 sm:ml-auto sm:w-auto">
              Export
            </button>
          </div>

          {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
          {loading && <p className="mt-4 text-sm text-gray-500">Loading transactions...</p>}
          {/* Summary */}
          <div className="mt-[18px] grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
            <SummaryCard title="Total received" value={formatNaira(received)} />

            <SummaryCard
              title="Successful"
              value={String(successful.length)}
              valueClass="text-[#32651C]"
            />

            <SummaryCard title="Pending" value={String(pending)} valueClass="text-[#8A4F05]" />

            <SummaryCard title="Failed" value={String(failed)} valueClass="text-[#A42626]" />
          </div>

          {/* Transactions table */}
          <div className="mt-5 w-full overflow-x-auto rounded-[11px] border border-[#E0E3E8] bg-white">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr className="h-[47px] border-b border-[#E5E7EB]">
                  <th className="whitespace-nowrap px-4 text-left text-[11px] font-semibold text-[#687386] sm:px-[23px]">
                    CUSTOMER
                  </th>

                  <th className="whitespace-nowrap px-4 text-left text-[11px] font-semibold text-[#687386] sm:px-[23px]">
                    CASHIER
                  </th>

                  <th className="whitespace-nowrap px-4 text-left text-[11px] font-semibold text-[#687386] sm:px-[23px]">
                    CHANNEL
                  </th>

                  <th className="whitespace-nowrap px-4 text-left text-[11px] font-semibold text-[#687386] sm:px-[23px]">
                    ITEMS
                  </th>

                  <th className="whitespace-nowrap px-4 text-left text-[11px] font-semibold text-[#687386] sm:px-[23px]">
                    AMOUNT
                  </th>

                  <th className="whitespace-nowrap px-4 text-left text-[11px] font-semibold text-[#687386] sm:px-[23px]">
                    STATUS
                  </th>

                  <th className="whitespace-nowrap px-4 text-left text-[11px] font-semibold text-[#687386] sm:px-[23px]">
                    TIME
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="h-[52px] border-b border-[#EEF0F3] last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 text-[13px] sm:px-[23px]">
                      <Link
                        href={"/transactions/" + encodeURIComponent(transaction.id)}
                        className="text-[#354052] hover:text-emerald-700 hover:underline"
                      >
                        {transaction.customer}
                      </Link>
                    </td>

                    <td className="whitespace-nowrap px-4 text-[13px] text-[#536074] sm:px-[23px]">
                      {transaction.cashier}
                    </td>

                    <td className="whitespace-nowrap px-4 text-[13px] text-[#536074] sm:px-[23px]">
                      {transaction.channel}
                    </td>

                    <td className="whitespace-nowrap px-4 text-[13px] text-[#536074] sm:px-[23px]">
                      {transaction.items}
                    </td>

                    <td className="whitespace-nowrap px-4 text-[13px] font-bold text-[#182033] sm:px-[23px]">
                      {transaction.amount}
                    </td>

                    <td className="whitespace-nowrap px-4 sm:px-[23px]">
                      <StatusBadge status={transaction.status} />
                    </td>

                    <td className="whitespace-nowrap px-4 text-[13px] text-[#687386] sm:px-[23px]">
                      {transaction.time}
                    </td>
                  </tr>
                ))}
                {!loading && filteredTransactions.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                    No matching sales have been recorded.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-[11px] text-[#8A93A2] sm:hidden">
            ← Swipe horizontally to view all transaction details →
          </p>
        </section>
      </main>
    </div>
  );
}