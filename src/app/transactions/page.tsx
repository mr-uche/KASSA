"use client";

import {
  Bell,
  ChevronDown,
  Search,
} from "lucide-react";

import KassaSidebar from "@/components/KassaSidebar";

const transactions = [
  {
    customer: "Mary Adeyemi",
    cashier: "Ifeoma Bassey",
    channel: "Transfer",
    items: "3 items",
    amount: "₦12,400",
    status: "Success",
    time: "9:14 AM",
  },
  {
    customer: "Walk-in customer",
    cashier: "Ifeoma Bassey",
    channel: "Cash",
    items: "1 item",
    amount: "₦3,200",
    status: "Success",
    time: "9:26 AM",
  },
  {
    customer: "Chuka Nwosu",
    cashier: "Ibrahim Musa",
    channel: "POS",
    items: "2 items",
    amount: "₦8,750",
    status: "Failed",
    time: "9:41 AM",
  },
  {
    customer: "Grace Umeh",
    cashier: "Ifeoma Bassey",
    channel: "USSD",
    items: "4 items",
    amount: "₦5,000",
    status: "Pending",
    time: "9:52 AM",
  },
  {
    customer: "Walk-in customer",
    cashier: "Ibrahim Musa",
    channel: "Card",
    items: "1 item",
    amount: "₦17,300",
    status: "Success",
    time: "10:03 AM",
  },
  {
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
      className={`inline-flex rounded-full px-3 py-[5px] text-[11px] font-semibold ${
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
      className="flex h-[42px] items-center justify-between rounded-[8px] border border-[#D4D9E0] bg-white px-[15px] text-[13px] text-[#3D4656]"
    >
      {children}

      <ChevronDown size={17} className="text-[#70798A]" />
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
    <div className="h-[73px] flex-1 rounded-[11px] border border-[#DFE3E8] bg-white px-[23px] py-[14px]">
      <p className="text-[12px] text-[#70798A]">{title}</p>

      <p
        className={`mt-[3px] text-[22px] font-bold tracking-[-0.3px] ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <KassaSidebar />

      <main className="ml-[198px] min-h-screen">
        {/* Header */}
        <header className="flex h-[80px] items-center justify-between border-b border-[#E5E7EB] bg-white px-[32px]">
          <h1 className="text-[21px] font-bold text-[#182033]">
            Transactions
          </h1>

          <div className="flex items-center gap-5">
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
        <section className="px-[32px] pb-[40px] pt-[32px]">
          {/* Filters */}
          <div className="flex items-center gap-[15px]">
            {/* Search */}
            <div className="relative w-[265px]">
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

            <FilterButton width="140px">
              <span>All channels</span>
            </FilterButton>

            <FilterButton width="140px">
              <span>All statuses</span>
            </FilterButton>

            <FilterButton width="160px">
              <span>Last 7 days</span>
            </FilterButton>

            <button className="ml-auto h-[42px] rounded-[8px] border border-[#D4D9E0] bg-white px-[17px] text-[13px] font-semibold text-[#394355]">
              Export
            </button>
          </div>

          {/* Summary */}
          <div className="mt-[18px] flex gap-[15px]">
            <SummaryCard
              title="Total received"
              value="₦2,840,600"
            />

            <SummaryCard
              title="Successful"
              value="612"
              valueClass="text-[#32651C]"
            />

            <SummaryCard
              title="Pending"
              value="14"
              valueClass="text-[#8A4F05]"
            />

            <SummaryCard
              title="Failed"
              value="9"
              valueClass="text-[#A42626]"
            />
          </div>

          {/* Transactions table */}
          <div className="mt-[20px] overflow-hidden rounded-[11px] border border-[#E0E3E8] bg-white">
            <table className="w-full border-collapse">
              <thead>
                <tr className="h-[47px] border-b border-[#E5E7EB]">
                  <th className="px-[23px] text-left text-[11px] font-semibold text-[#687386]">
                    CUSTOMER
                  </th>

                  <th className="px-[23px] text-left text-[11px] font-semibold text-[#687386]">
                    CASHIER
                  </th>

                  <th className="px-[23px] text-left text-[11px] font-semibold text-[#687386]">
                    CHANNEL
                  </th>

                  <th className="px-[23px] text-left text-[11px] font-semibold text-[#687386]">
                    ITEMS
                  </th>

                  <th className="px-[23px] text-left text-[11px] font-semibold text-[#687386]">
                    AMOUNT
                  </th>

                  <th className="px-[23px] text-left text-[11px] font-semibold text-[#687386]">
                    STATUS
                  </th>

                  <th className="px-[23px] text-left text-[11px] font-semibold text-[#687386]">
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
                    <td className="px-[23px] text-[13px] text-[#354052]">
                      {transaction.customer}
                    </td>

                    <td className="px-[23px] text-[13px] text-[#536074]">
                      {transaction.cashier}
                    </td>

                    <td className="px-[23px] text-[13px] text-[#536074]">
                      {transaction.channel}
                    </td>

                    <td className="px-[23px] text-[13px] text-[#536074]">
                      {transaction.items}
                    </td>

                    <td className="px-[23px] text-[13px] font-bold text-[#182033]">
                      {transaction.amount}
                    </td>

                    <td className="px-[23px]">
                      <StatusBadge status={transaction.status} />
                    </td>

                    <td className="px-[23px] text-[13px] text-[#687386]">
                      {transaction.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}