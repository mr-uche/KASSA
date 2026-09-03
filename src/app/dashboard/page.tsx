"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  Menu,
  Plus,
  ScanBarcode,
  Users,
} from "lucide-react";

import KassaSidebar from "@/components/KassaSidebar";

const transactions = [
  {
    customer: "Mary Adeyemi",
    cashier: "Ifeoma Bassey",
    channel: "Transfer",
    amount: "₦12,400",
    status: "Success",
    time: "9:14 AM",
  },
  {
    customer: "Walk-in customer",
    cashier: "Ifeoma Bassey",
    channel: "Cash",
    amount: "₦3,200",
    status: "Success",
    time: "9:26 AM",
  },
  {
    customer: "Chuka Nwosu",
    cashier: "Ibrahim Musa",
    channel: "POS",
    amount: "₦8,750",
    status: "Failed",
    time: "9:41 AM",
  },
  {
    customer: "Grace Umeh",
    cashier: "Ifeoma Bassey",
    channel: "USSD",
    amount: "₦5,000",
    status: "Pending",
    time: "9:52 AM",
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
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold ${
        styles[status as keyof typeof styles]
      }`}
    >
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

            <h1 className="truncate text-[18px] font-bold text-[#182033] sm:text-[20px] lg:text-[21px]">
              Good morning, Adebola
            </h1>
          </div>

          {/* Header actions */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-5">
            {/* Branch selector */}
            <button
              className="hidden h-[34px] w-[130px] items-center justify-between rounded-[9px] border border-[#D8DCE3] bg-white px-3 text-[12px] text-[#374151] sm:flex sm:w-[150px] sm:text-[13px] lg:w-[162px]"
              type="button"
            >
              <span>All branches</span>
              <ChevronDown size={16} className="text-[#687386]" />
            </button>

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total sales today"
              value="₦482,600"
              subtitle="↑ 12% vs yesterday"
              subtitleClass="text-[#4D7C27]"
            />

            <StatCard
              title="Transactions"
              value="146"
              subtitle="↑ 8 vs yesterday"
              subtitleClass="text-[#4D7C27]"
            />

            <StatCard
              title="Failed payments"
              value="3"
              subtitle="Needs attention"
              valueClass="text-[#B82E2E]"
              subtitleClass="text-[#C73737]"
            />

            <StatCard
              title="Branches active"
              value="2 / 2"
              subtitle="All reporting in"
              subtitleClass="text-[#70798A]"
            />
          </div>

          {/* Quick actions */}
          <div className="mt-7">
            <h2 className="mb-3 text-[15px] font-bold text-[#182033]">
              Quick actions
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
              {/* New sale */}
              <Link
                href="/sales/new"
                className="flex h-[72px] w-full flex-col items-center justify-center rounded-[9px] bg-[#08745F] text-white shadow-sm transition hover:bg-[#075F50] sm:w-auto sm:min-w-[164px]"
              >
                <div className="flex items-center gap-2 text-[14px] font-semibold">
                  <Plus size={17} />
                  New sale
                </div>

                <span className="mt-1 text-[11px] text-white/90">
                  Start checkout
                </span>
              </Link>

              {/* Scan product */}
              <Link
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
              </Link>

              {/* Customers */}
              <Link
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
              </Link>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="text-[15px] font-bold text-[#182033]">
                Recent Transactions
              </h2>

              <Link
                href="/transactions"
                className="shrink-0 text-[13px] font-semibold text-[#08745F] hover:underline"
              >
                View all
              </Link>
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
                  {transactions.map((transaction, index) => (
                    <tr
                      key={index}
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