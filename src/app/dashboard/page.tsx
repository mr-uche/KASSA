"use client";

import Link from "next/link";
import {
  Bell,
  ChevronDown,
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
      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
        styles[status as keyof typeof styles]
      }`}
    >
      {status}
    </span>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <KassaSidebar />

      {/* Main area */}
      <main className="ml-[198px] min-h-screen">
        {/* Header */}
        <header className="flex h-[80px] items-center justify-between border-b border-[#E5E7EB] bg-white px-[32px]">
          <h1 className="text-[21px] font-bold text-[#182033]">
            Good morning, Adebola
          </h1>

          <div className="flex items-center gap-5">
            {/* Branch selector */}
            <button className="flex h-[34px] w-[162px] items-center justify-between rounded-[9px] border border-[#D8DCE3] bg-white px-3 text-[13px] text-[#374151]">
              <span>All branches</span>
              <ChevronDown size={17} className="text-[#687386]" />
            </button>

            {/* Notification */}
            <button className="relative flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#F8F9FA]">
              <Bell size={17} className="text-[#98A1AE]" />

              <span className="absolute right-[8px] top-[6px] h-[7px] w-[7px] rounded-full bg-[#E54848]" />
            </button>

            {/* Profile */}
            <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#E5F5F0] text-[12px] font-semibold text-[#08745F]">
              AO
            </div>
          </div>
        </header>

        {/* Content */}
        <section className="px-[32px] pb-[40px] pt-[50px]">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-[16px]">
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
          <div className="mt-[26px]">
            <h2 className="mb-[12px] text-[15px] font-bold text-[#182033]">
              Quick actions
            </h2>

            <div className="flex gap-[12px]">
              <Link
                href="/sales/new"
                className="flex h-[72px] w-[164px] flex-col items-center justify-center rounded-[9px] bg-[#08745F] text-white shadow-sm transition hover:bg-[#075F50]"
              >
                <div className="flex items-center gap-2 text-[14px] font-semibold">
                  <Plus size={17} />
                  New sale
                </div>

                <span className="mt-1 text-[11px] text-white/90">
                  Start checkout
                </span>
              </Link>

              <Link
  href="/scan"
  className="flex h-[72px] w-[164px] flex-col items-center justify-center rounded-[9px] border border-[#D2D7DE] bg-white text-[#182033]"
>
  <div className="flex items-center gap-2 text-[14px] font-semibold">
    <ScanBarcode size={17} />
    Scan product
  </div>

  <span className="mt-1 text-[11px] text-[#70798A]">
    Barcode lookup
  </span>
</Link>

              <Link
  href="/customers"
  className="flex h-[72px] w-[164px] flex-col items-center justify-center rounded-[9px] border border-[#D2D7DE] bg-white text-[#182033]"
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
          <div className="mt-[32px]">
            <div className="mb-[12px] flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#182033]">
                Recent Transactions
              </h2>

              <Link
                href="/transactions"
                className="text-[13px] font-semibold text-[#08745F]"
              >
                View all
              </Link>
            </div>

            <div className="overflow-hidden rounded-[12px] border border-[#E0E3E8] bg-white">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="h-[47px] border-b border-[#E5E7EB]">
                    <th className="px-6 text-left text-[11px] font-semibold text-[#687386]">
                      CUSTOMER
                    </th>
                    <th className="px-6 text-left text-[11px] font-semibold text-[#687386]">
                      CASHIER
                    </th>
                    <th className="px-6 text-left text-[11px] font-semibold text-[#687386]">
                      CHANNEL
                    </th>
                    <th className="px-6 text-left text-[11px] font-semibold text-[#687386]">
                      AMOUNT
                    </th>
                    <th className="px-6 text-left text-[11px] font-semibold text-[#687386]">
                      STATUS
                    </th>
                    <th className="px-6 text-left text-[11px] font-semibold text-[#687386]">
                      TIME
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((transaction, index) => (
                    <tr
                      key={index}
                      className="h-[52px] border-b border-[#EEF0F3] last:border-0"
                    >
                      <td className="px-6 text-[13px] text-[#354052]">
                        {transaction.customer}
                      </td>

                      <td className="px-6 text-[13px] text-[#536074]">
                        {transaction.cashier}
                      </td>

                      <td className="px-6 text-[13px] text-[#536074]">
                        {transaction.channel}
                      </td>

                      <td className="px-6 text-[13px] font-bold text-[#182033]">
                        {transaction.amount}
                      </td>

                      <td className="px-6">
                        <StatusBadge status={transaction.status} />
                      </td>

                      <td className="px-6 text-[13px] text-[#687386]">
                        {transaction.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
    <div className="h-[113px] rounded-[12px] border border-[#DFE3E8] bg-white px-[23px] py-[19px]">
      <p className="text-[13px] text-[#70798A]">{title}</p>

      <p
        className={`mt-[3px] text-[27px] font-bold tracking-[-0.5px] text-[#182033] ${valueClass}`}
      >
        {value}
      </p>

      <p className={`mt-0 text-[12px] ${subtitleClass}`}>
        {subtitle}
      </p>
    </div>
  );
}