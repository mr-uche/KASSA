"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
} from "lucide-react";

import KassaSidebar from "@/components/KassaSidebar";

const transactions = [
  {
    id: "TXN-2026-000141",
    customer: "Mary Adeyemi",
    cashier: "Ifeoma Bassey",
    channel: "Transfer",
    items: "3 items",
    amount: "₦12,400",
    status: "Success",
    time: "9:14 AM",
  },
  {
    id: "TXN-2026-000142",
    customer: "Walk-in customer",
    cashier: "Ifeoma Bassey",
    channel: "Cash",
    items: "1 item",
    amount: "₦3,200",
    status: "Success",
    time: "9:26 AM",
  },
  {
    id: "TXN-2026-000143",
    customer: "Chuka Nwosu",
    cashier: "Ibrahim Musa",
    channel: "POS",
    items: "2 items",
    amount: "₦8,750",
    status: "Failed",
    time: "9:41 AM",
  },
  {
    id: "TXN-2026-000144",
    customer: "Grace Umeh",
    cashier: "Ifeoma Bassey",
    channel: "USSD",
    items: "4 items",
    amount: "₦5,000",
    status: "Pending",
    time: "9:52 AM",
  },
  {
    id: "TXN-2026-000145",
    customer: "Walk-in customer",
    cashier: "Ibrahim Musa",
    channel: "Card",
    items: "1 item",
    amount: "₦17,300",
    status: "Success",
    time: "10:03 AM",
  },
  {
    id: "TXN-2026-000146",
    customer: "Tunde Bakare",
    cashier: "Ifeoma Bassey",
    channel: "Hefa Wallet",
    items: "2 items",
    amount: "₦6,900",
    status: "Success",
    time: "10:18 AM",
  },
];

function StatusBadge({ status }: { status: string }) {
  const styles = {
    Success: "bg-[#E8F3DC] text-[#32651C]",
    Failed: "bg-[#FCE5E5] text-[#A42626]",
    Pending: "bg-[#FCEED8] text-[#8A4F05]",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-[5px] text-[11px] font-semibold ${
        styles[status as keyof typeof styles]
      }`}
    >
      {status}
    </span>
  );
}

function FilterButton({
  children,
  width = "140px",
}: {
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <button
      style={{ width }}
      className="flex h-[42px] shrink-0 items-center justify-between rounded-[8px] border border-[#D4D9E0] bg-white px-[15px] text-[13px] text-[#3D4656]"
    >
      {children}

      <ChevronDown size={17} className="ml-2 shrink-0 text-[#70798A]" />
    </button>
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
    <div className="min-h-[73px] rounded-[11px] border border-[#DFE3E8] bg-white px-4 py-[14px] sm:px-[23px]">
      <p className="text-[12px] text-[#70798A]">{title}</p>

      <p
        className={`mt-[3px] text-[19px] font-bold tracking-[-0.3px] sm:text-[22px] ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

export default function TransactionsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
                placeholder="Search customer or reference"
                className="h-[42px] w-full rounded-[8px] border border-[#D4D9E0] bg-white pl-[40px] pr-[12px] text-[13px] text-[#374151] outline-none placeholder:text-[#9BA4B3] focus:border-[#08745F]"
              />
            </div>

            {/* Filter row: horizontal scroll on mobile instead of wrapping/overflow */}
            <div className="-mx-4 flex gap-[10px] overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:gap-[15px] sm:overflow-visible sm:px-0">
              <FilterButton width="140px">
                <span>All channels</span>
              </FilterButton>

              <FilterButton width="140px">
                <span>All statuses</span>
              </FilterButton>

              <FilterButton width="160px">
                <span>Last 7 days</span>
              </FilterButton>
            </div>

            <button className="h-[42px] w-full rounded-[8px] border border-[#D4D9E0] bg-white px-[17px] text-[13px] font-semibold text-[#394355] sm:ml-auto sm:w-auto">
              Export
            </button>
          </div>

          {/* Summary */}
          <div className="mt-[18px] grid grid-cols-2 gap-3 sm:flex sm:gap-[15px]">
            <SummaryCard title="Total received" value="₦2,840,600" />

            <SummaryCard
              title="Successful"
              value="612"
              valueClass="text-[#32651C]"
            />

            <SummaryCard title="Pending" value="14" valueClass="text-[#8A4F05]" />

            <SummaryCard title="Failed" value="9" valueClass="text-[#A42626]" />
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
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="h-[52px] border-b border-[#EEF0F3] last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 text-[13px] sm:px-[23px]">
                      <Link
                        href={
                          transaction.status === "Pending"
                            ? `/transactions/${transaction.id}/dispute`
                            : `/transactions/${transaction.id}`
                        }
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