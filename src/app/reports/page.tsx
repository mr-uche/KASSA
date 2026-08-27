"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";

const rangeTabs = ["Daily", "Weekly", "Monthly", "Custom range"] as const;
type RangeTab = (typeof rangeTabs)[number];

const channelColors: Record<string, string> = {
  "Bank transfer": "bg-emerald-800",
  POS: "bg-emerald-500",
  Cash: "bg-emerald-300",
  USSD: "bg-emerald-200",
  "Card & wallet": "bg-emerald-100",
};

const channelOrder = ["Bank transfer", "POS", "Cash", "USSD", "Card & wallet"];

function SummaryCard({
  label,
  value,
  delta,
  deltaPositive = true,
  sub,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-2">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {delta && (
        <p className={`text-xs mt-1 ${deltaPositive ? "text-emerald-600" : "text-red-600"}`}>
          {deltaPositive ? "↑" : "↓"} {delta}
        </p>
      )}
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function ChannelBreakdown({ data }: { data: { name: string; pct: number }[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Sales by channel</h2>
      <p className="text-xs text-gray-400 mb-5">Colors match the trend chart on the left</p>
      <div className="space-y-4">
        {data.map((c) => (
          <div key={c.name}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${channelColors[c.name]}`} />
              <span className="text-sm text-gray-700 flex-1">{c.name}</span>
              <span className="text-sm text-gray-500">{c.pct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${channelColors[c.name]}`}
                style={{ width: `${c.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StackedTrendChart({
  data,
  title,
}: {
  data: { label: string; segments: number[] }[];
  title: string;
}) {
  const maxTotal = Math.max(...data.map((d) => d.segments.reduce((a, b) => a + b, 0)));

  return (
    <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">{title}</h2>
      <p className="text-xs text-gray-400 mb-6">
        Colors match the trend chart on the left
      </p>

      <div className="flex items-end justify-between gap-4 h-64">
        {data.map((d) => {
          const total = d.segments.reduce((a, b) => a + b, 0);
          return (
            <div key={d.label} className="flex flex-col items-center gap-2 flex-1 h-full">
              <div className="w-full max-w-[52px] flex flex-col-reverse justify-start flex-1">
                {d.segments.map((seg, i) => {
                  const heightPct = (seg / maxTotal) * 100;
                  return (
                    <div
                      key={i}
                      className={`w-full ${channelColors[channelOrder[i]]} ${
                        i === d.segments.length - 1 ? "rounded-t-md" : ""
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  );
                })}
              </div>
              <span className="text-xs text-gray-500">{d.label}</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-gray-100">
        {channelOrder.map((name) => (
          <div key={name} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-sm ${channelColors[name]}`} />
            <span className="text-xs text-gray-600">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffTable({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; transactions: number; total: string; failed: number }[];
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <th className="pb-3 font-medium">Staff</th>
            <th className="pb-3 font-medium">Transactions</th>
            <th className="pb-3 font-medium">Total sales</th>
            <th className="pb-3 font-medium">Failed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-gray-50 last:border-0">
              <td className="py-3 text-gray-700">{r.name}</td>
              <td className="py-3 text-gray-700">{r.transactions.toLocaleString()}</td>
              <td className="py-3 font-medium text-gray-900">{r.total}</td>
              <td className="py-3 text-red-600">{r.failed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ----- Daily data -----
const dailyTrend = [
  { label: "Mon", segments: [26, 17, 11, 6, 2] },
  { label: "Tue", segments: [33, 21, 14, 7, 3] },
  { label: "Wed", segments: [20, 13, 9, 4, 2] },
  { label: "Thu", segments: [39, 25, 17, 8, 3] },
  { label: "Fri", segments: [34, 22, 15, 7, 3] },
  { label: "Sat", segments: [40, 26, 17, 9, 4] },
  { label: "Sun", segments: [42, 27, 18, 9, 4] },
];
const dailyChannels = [
  { name: "Bank transfer", pct: 42 },
  { name: "POS", pct: 27 },
  { name: "Cash", pct: 18 },
  { name: "USSD", pct: 9 },
  { name: "Card & wallet", pct: 4 },
];
const dailyStaff = [
  { name: "Ifeoma Bassey", transactions: 88, total: "₦612,400", failed: 2 },
  { name: "Ibrahim Musa", transactions: 58, total: "₦408,200", failed: 1 },
];

// ----- Weekly data -----
const weeklyTrend = [
  { label: "Wk 1", segments: [16, 10, 7, 4, 1] },
  { label: "Wk 2", segments: [24, 14, 9, 5, 2] },
  { label: "Wk 3", segments: [11, 7, 5, 3, 1] },
  { label: "Wk 4", segments: [25, 16, 10, 6, 2] },
  { label: "Wk 5", segments: [21, 13, 8, 5, 2] },
  { label: "Wk 6", segments: [28, 18, 12, 7, 2] },
];
const weeklyChannels = [
  { name: "Bank transfer", pct: 41 },
  { name: "POS", pct: 29 },
  { name: "Cash", pct: 17 },
  { name: "USSD", pct: 10 },
  { name: "Card & wallet", pct: 3 },
];
const weeklyStaff = [
  { name: "Ifeoma Bassey", transactions: 512, total: "₦10,214,600", failed: 6 },
  { name: "Ibrahim Musa", transactions: 338, total: "₦6,725,600", failed: 3 },
];

// ----- Monthly data -----
const monthlyTrend = [
  { label: "Mar", segments: [17, 11, 7, 4, 2] },
  { label: "Apr", segments: [22, 14, 9, 5, 2] },
  { label: "May", segments: [15, 10, 6, 3, 1] },
  { label: "Jun", segments: [33, 21, 14, 8, 3] },
  { label: "Jul", segments: [40, 26, 17, 9, 4] },
  { label: "Aug", segments: [35, 23, 15, 8, 3] },
];
const monthlyChannels = [
  { name: "Bank transfer", pct: 39 },
  { name: "POS", pct: 30 },
  { name: "Cash", pct: 15 },
  { name: "USSD", pct: 12 },
  { name: "Card & wallet", pct: 4 },
];
const monthlyStaff = [
  { name: "Ifeoma Bassey", transactions: 2204, total: "₦41,052,600", failed: 24 },
  { name: "Ibrahim Musa", transactions: 1458, total: "₦27,368,300", failed: 14 },
];

// ----- Custom range data -----
// ----- Custom range data -----
const customTrend = [18, 22, 15, 28, 24, 32, 27, 36, 30, 40];
const customChannels = [
  { name: "Bank transfer", pct: 40 },
  { name: "POS", pct: 28 },
  { name: "Cash", pct: 18 },
  { name: "USSD", pct: 10 },
  { name: "Card & wallet", pct: 4 },
];
const customStaff = [
  { name: "Ifeoma Bassey", transactions: 1764, total: "₦14,540,200", failed: 9 },
  { name: "Ibrahim Musa", transactions: 1182, total: "₦9,640,300", failed: 6 },
];

function LineChart({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const w = 600;
  const h = 220;
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 20) - 10;
    return `${x},${y}`;
  });
  const areaPoints = `0,${h} ${points.join(" ")} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56">
      <polygon points={areaPoints} fill="#08745F" fillOpacity="0.08" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="#08745F"
        strokeWidth={2.5}
      />
      {values.map((v, i) => {
        const [x, y] = points[i].split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r={4} fill="#08745F" />;
      })}
    </svg>
  );
}

export default function ReportsPage() {
  const [range, setRange] = useState<RangeTab>("Daily");
  const [fromDate, setFromDate] = useState("2026-07-01");
  const [toDate, setToDate] = useState("2026-08-19");

  return (
    <div className="min-h-screen bg-gray-50">
      <KassaSidebar />

      <main className="ml-[198px] p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          Reports & Analytics
        </h1>

        {/* Range tabs + download */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex bg-white rounded-lg border border-gray-200 p-1">
            {rangeTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setRange(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  range === tab
                    ? "bg-emerald-800 text-white"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download size={16} />
            Download Report
          </button>
        </div>

        {/* ---------------- DAILY ---------------- */}
        {range === "Daily" && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <SummaryCard label="Total sales (7 days)" value="₦2,840,600" delta="9% vs prior week" />
              <SummaryCard label="Avg transaction value" value="₦8,270" delta="3% vs prior week" />
              <SummaryCard
                label="Failed payment rate"
                value="2.1%"
                delta="0.4pt vs prior week"
                deltaPositive={false}
              />
              <SummaryCard label="Top branch" value="Main branch" sub="64% of total sales" />
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <StackedTrendChart data={dailyTrend} title="Sales trend — last 7 days, by channel" />
              <ChannelBreakdown data={dailyChannels} />
            </div>

            <StaffTable title="Sales by staff member — last 7 days" rows={dailyStaff} />
          </>
        )}

        {/* ---------------- WEEKLY ---------------- */}
        {range === "Weekly" && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <SummaryCard label="Total sales (6 weeks)" value="₦16,940,200" delta="14% vs prior 6 weeks" />
              <SummaryCard label="Avg weekly sales" value="₦2,823,366" delta="6% vs prior period" />
              <SummaryCard
                label="Failed payment rate"
                value="1.8%"
                delta="0.3pt vs prior period"
                deltaPositive={false}
              />
              <SummaryCard label="Best week" value="Week 6" sub="₦3,412,800 in sales" />
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <StackedTrendChart data={weeklyTrend} title="Sales trend — last 6 weeks, by channel" />
              <ChannelBreakdown data={weeklyChannels} />
            </div>

            <StaffTable title="Sales by staff member — last 6 weeks" rows={weeklyStaff} />
          </>
        )}

        {/* ---------------- MONTHLY ---------------- */}
        {range === "Monthly" && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <SummaryCard label="Total sales (6 months)" value="₦68,420,900" delta="21% vs prior 6 months" />
              <SummaryCard label="Avg monthly sales" value="₦11,403,483" delta="9% vs prior period" />
              <SummaryCard
                label="Failed payment rate"
                value="1.6%"
                delta="0.5pt vs prior period"
                deltaPositive={false}
              />
              <SummaryCard label="Best month" value="July 2026" sub="₦13,860,400 in sales" />
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <StackedTrendChart data={monthlyTrend} title="Sales trend — last 6 months, by channel" />
              <ChannelBreakdown data={monthlyChannels} />
            </div>

            <StaffTable title="Sales by staff member — last 6 months" rows={monthlyStaff} />
          </>
        )}

{/* ------------ CUSTOM RANGE ------------ */}
        {range === "Custom range" && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 flex items-end gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              <span className="text-gray-400 pb-2.5">→</span>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              <div className="flex gap-2 pb-2.5">
                <button className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">
                  Last 30 days
                </button>
                <button className="px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">
                  This quarter
                </button>
                <button className="px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">
                  Year to date
                </button>
              </div>
              <button className="ml-auto bg-emerald-800 hover:bg-emerald-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
                Apply
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <SummaryCard label="Total sales (1 Jul – 19 Aug)" value="₦24,180,500" delta="11% vs same period prior" />
              <SummaryCard label="Transactions" value="2,946" delta="7% vs same period prior" />
              <SummaryCard
                label="Failed payment rate"
                value="1.7%"
                delta="0.4pt vs same period prior"
                deltaPositive={false}
              />
              <SummaryCard label="Days covered" value="50 days" sub="1 Jul – 19 Aug 2026" />
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-6">
                  Sales trend — 1 Jul to 19 Aug 2026
                </h2>
                <LineChart values={customTrend} />
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                  <span>Jul 1</span>
                  <span>Jul 20</span>
                  <span>Aug 8</span>
                  <span>Aug 19</span>
                </div>
              </div>
              <ChannelBreakdown data={customChannels} />
            </div>

            <StaffTable title="Sales by staff member — 1 Jul to 19 Aug 2026" rows={customStaff} />
          </>
        )}
      </main>
    </div>
  );
}