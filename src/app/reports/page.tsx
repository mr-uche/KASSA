"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Download, Menu, RefreshCw } from "lucide-react";
import KassaSidebar from "@/components/KassaSidebar";
import { formatNaira, inventoryFetch } from "@/lib/inventory-client";
import {
  fetchAnalytics, type AnalyticsReport, type ReportChannel, type ReportGranularity,
} from "@/lib/reports-client";

type RangeTab = "Daily" | "Weekly" | "Monthly" | "Custom range";
type QuickRange = "Last 30 days" | "This quarter" | "Year to date" | "Custom dates";
type Branch = { id: string; name: string; isActive: boolean };
type Membership = { id: string; name: string; myRole: string; branches: Branch[] };
const rangeTabs: RangeTab[] = ["Daily", "Weekly", "Monthly", "Custom range"];
const channelOrder: ReportChannel[] = [
  "BANK_TRANSFER", "POS", "CASH", "USSD", "CARD", "WALLET",
];
const channelNames: Record<ReportChannel, string> = {
  BANK_TRANSFER: "Bank transfer",
  POS: "POS",
  CASH: "Cash",
  USSD: "USSD",
  CARD: "Card",
  WALLET: "Wallet",
};
const channelColors: Record<ReportChannel, string> = {
  BANK_TRANSFER: "bg-emerald-800",
  POS: "bg-emerald-600",
  CASH: "bg-emerald-400",
  USSD: "bg-emerald-300",
  CARD: "bg-emerald-200",
  WALLET: "bg-emerald-100",
};

const DAY = 86400000;
function todayLagos() {
  return new Date(Date.now() + 3600000).toISOString().slice(0, 10);
}
function dateMs(iso: string) {
  return Date.parse(iso + "T00:00:00Z");
}
function shiftDate(iso: string, days: number) {
  return new Date(dateMs(iso) + days * DAY).toISOString().slice(0, 10);
}
function startOfWeek(iso: string) {
  const weekday = new Date(dateMs(iso)).getUTCDay();
  return shiftDate(iso, -((weekday + 6) % 7));
}
function startOfMonth(iso: string) {
  return iso.slice(0, 7) + "-01";
}
function shiftMonth(iso: string, months: number) {
  const date = new Date(dateMs(startOfMonth(iso)));
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}
function lastDayCount(from: string, to: string) {
  return Math.floor((dateMs(to) - dateMs(from)) / DAY) + 1;
}
function getDates(range: RangeTab, quick: QuickRange, customFrom: string, customTo: string) {
  const today = todayLagos();
  if (range === "Daily") {
    return { from: shiftDate(today, -6), to: today, granularity: "day" as ReportGranularity, label: "Last 7 days" };
  }
  if (range === "Weekly") {
    return { from: shiftDate(startOfWeek(today), -35), to: today, granularity: "week" as ReportGranularity, label: "Last 6 calendar weeks" };
  }
  if (range === "Monthly") {
    return { from: shiftMonth(today, -5), to: today, granularity: "month" as ReportGranularity, label: "Last 6 calendar months" };
  }
  let from = customFrom, to = customTo;
  if (quick === "Last 30 days") {
    from = shiftDate(today, -29); to = today;
  } else if (quick === "This quarter") {
    const current = new Date(dateMs(today));
    current.setUTCMonth(Math.floor(current.getUTCMonth() / 3) * 3, 1);
    from = current.toISOString().slice(0, 10); to = today;
  } else if (quick === "Year to date") {
    from = today.slice(0, 4) + "-01-01"; to = today;
  }
  const days = lastDayCount(from, to);
  return { from, to,
    granularity: (days <= 31 ? "day" : days <= 93 ? "week" : "month") as ReportGranularity,
    label: quick === "Custom dates" ? "Selected dates" : quick };
}
function buildBuckets(from: string, to: string, granularity: ReportGranularity) {
  let cursor = granularity === "month" ? startOfMonth(from) :
    granularity === "week" ? startOfWeek(from) : from;
  const buckets: string[] = [];
  while (cursor <= to && buckets.length < 370) {
    buckets.push(cursor);
    cursor = granularity === "month" ? shiftMonth(cursor, 1) :
      shiftDate(cursor, granularity === "week" ? 7 : 1);
  }
  return buckets;
}
function bucketLabel(iso: string, granularity: ReportGranularity) {
  const date = new Date(dateMs(iso));
  return date.toLocaleDateString("en-GB", {
    timeZone: "UTC", month: "short",
    ...(granularity === "month" ? { year: "2-digit" } : { day: "numeric" }),
  });
}
function formatMoney(value: string) {
  return formatNaira(value);
}
function SummaryCard({ label, value, sub }: {
  label: string; value: string; sub?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <p className="mb-2 text-sm text-gray-500">{label}</p>
      <p className="break-words text-xl font-semibold text-gray-900 sm:text-2xl">{value}</p>
      {sub && <p className="mt-2 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}
function ChannelLegend() {
  return (
    <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-gray-100 pt-4">
      {channelOrder.map((channel) => (
        <div key={channel} className="flex items-center gap-2">
          <span className={"h-2.5 w-2.5 shrink-0 rounded-sm " + channelColors[channel]}/>
          <span className="text-xs text-gray-600">{channelNames[channel]}</span>
        </div>
      ))}
    </div>
  );
}
function StackedTrendChart({ report }: { report: AnalyticsReport }) {
  const { from, to, granularity } = report.scope;
  const keys = useMemo(() => buildBuckets(from, to, granularity), [from, to, granularity]);
  const amounts = new Map<string, Partial<Record<ReportChannel, number>>>();
  for (const entry of report.trend) {
    const current = amounts.get(entry.period) ?? {};
    current[entry.channel] = Number(entry.amount);
    amounts.set(entry.period, current);
  }
  const totals = keys.map((key) => channelOrder.reduce(
    (sum, channel) => sum + (amounts.get(key)?.[channel] ?? 0), 0,
  ));
  const max = Math.max(1, ...totals);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 lg:col-span-2">
      <h2 className="text-base font-semibold text-gray-900">Confirmed sales trend</h2>
      <p className="mb-6 mt-1 text-xs text-gray-500">
        Paid sales by {granularity}; channel colours show confirmed revenue only.
      </p>
      <div className="overflow-x-auto">
        <div className="flex h-60 min-w-full items-end justify-between gap-2 pb-1" style={{
          width: keys.length > 10 ? String(keys.length * 38) + "px" : "100%",
        }}>
          {keys.map((key) => (
            <div key={key} className="flex h-full min-w-[25px] flex-1 flex-col items-center gap-2">
              <div className="flex w-full max-w-[48px] flex-1 flex-col-reverse overflow-hidden rounded-t-md"
                title={key + ": " + formatMoney(totals[keys.indexOf(key)].toFixed(2))}>
                {channelOrder.map((channel) => {
                  const value = amounts.get(key)?.[channel] ?? 0;
                  return value > 0 ? (
                    <div key={channel} className={"w-full " + channelColors[channel]}
                      style={{ height: String(value / max * 100) + "%" }}/>
                  ) : null;
                })}
              </div>
              <span className="whitespace-nowrap text-[11px] text-gray-500">{bucketLabel(key, granularity)}</span>
            </div>
          ))}
        </div>
      </div>
      {report.summary.paidTransactions === 0 && (
        <p className="mt-3 text-center text-xs text-gray-500">No confirmed sales in this date range.</p>
      )}
      <ChannelLegend/>
    </div>
  );
}
function ChannelBreakdown({ report }: { report: AnalyticsReport }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
      <h2 className="text-base font-semibold text-gray-900">Sales by channel</h2>
      <p className="mb-5 mt-1 text-xs text-gray-500">Share of confirmed gross sales</p>
      <div className="space-y-4">
        {report.channels.map((entry) => (
          <div key={entry.channel}>
            <div className="mb-1.5 flex items-center gap-2">
              <span className={"h-2.5 w-2.5 shrink-0 rounded-sm " + channelColors[entry.channel]}/>
              <span className="flex-1 text-sm text-gray-700">{channelNames[entry.channel]}</span>
              <span className="text-sm text-gray-500">{entry.sharePct.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className={"h-full rounded-full " + channelColors[entry.channel]}
                style={{ width: String(entry.sharePct) + "%" }}/>
            </div>
            <p className="mt-1 text-xs text-gray-400">{formatMoney(entry.amount)} · {entry.paidTransactions} paid</p>
          </div>
        ))}
      </div>
    </div>
  );
}
function TablePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
      <h2 className="mb-4 text-base font-semibold text-gray-900">{title}</h2>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
function csvRows(report: AnalyticsReport) {
  const rows: string[][] = [];
  function add(...values: Array<string | number | null>) {
    rows.push(values.map((item) => item == null ? "" : String(item)));
  }
  add("Kassa reports & analytics", report.scope.from + " to " + report.scope.to);
  add("Business ID", report.scope.businessId);
  add("Branch ID", report.scope.branchId ?? "All branches");
  add("Reporting timezone", report.scope.timezone);
  add();
  add("Summary", "Value");
  add("Confirmed gross sales (NGN)", report.summary.paidSales);
  add("Confirmed paid transactions", report.summary.paidTransactions);
  add("Average confirmed sale (NGN)", report.summary.averageSale);
  add("Pending sales", report.summary.pendingTransactions);
  add("Failed payment attempts", report.summary.failedPayments);
  add("Failed payment rate (%)", report.summary.failedPaymentRate);
  add("Previous period confirmed sales (NGN)", report.summary.previousPaidSales);
  add("Change from previous period (%)", report.summary.salesChangePercent);
  add();
  add("Channel", "Paid gross sales (NGN)", "Paid transactions", "Share (%)");
  report.channels.forEach((r) => add(channelNames[r.channel], r.amount, r.paidTransactions, r.sharePct));
  add();
  add("Trend period", "Channel", "Confirmed sales (NGN)", "Paid transactions");
  report.trend.forEach((r) => add(r.period, channelNames[r.channel], r.amount, r.transactions));
  add();
  add("Cashier", "Paid transactions", "Confirmed gross sales (NGN)", "Failed payments");
  report.staff.forEach((r) => add(r.name, r.paidTransactions, r.paidSales, r.failedPayments));
  add();
  add("Branch", "Confirmed gross sales (NGN)", "Paid transactions");
  report.branches.forEach((r) => add(r.name, r.amount, r.paidTransactions));
  add();
  add("Product", "Units sold", "Confirmed gross sales (NGN)");
  report.products.forEach((r) => add(r.name, r.unitsSold, r.paidSales));
  add();
  report.notes.forEach((note) => add("Note", note));
  return rows;
}

export default function ReportsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [branchId, setBranchId] = useState("all");
  const [owner, setOwner] = useState(false);
  const [range, setRange] = useState<RangeTab>("Daily");
  const [quick, setQuick] = useState<QuickRange>("Last 30 days");
  const [customFrom, setCustomFrom] = useState(() => shiftDate(todayLagos(), -29));
  const [customTo, setCustomTo] = useState(() => todayLagos());
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const dates = useMemo(() => getDates(range, quick, customFrom, customTo),
    [range, quick, customFrom, customTo]);
  const currentBusiness = memberships.find((m) => m.id === businessId);
  const selectedBranch = branchId === "all" ? "All branches" :
    currentBusiness?.branches.find((branch) => branch.id === branchId)?.name ?? "Branch";
  const selectableBranches = currentBusiness?.branches ?? [];

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const data = await inventoryFetch<Membership[]>("/api/businesses/mine");
        if (!active) return;
        if (!data.length) throw new Error("Complete business onboarding to view reports.");
        const selected = localStorage.getItem("selectedBranchId") ?? "";
        const business = data.find((item) => item.branches.some((branch) => branch.id === selected)) ?? data[0];
        setMemberships(data);
        setBusinessId(business.id);
        setOwner(business.myRole === "Owner");
        setBranchId(business.myRole === "Owner" ? "all" : business.branches[0]?.id ?? "all");
      } catch (cause) {
        if (active) { setError(cause instanceof Error ? cause.message : "Unable to load branches."); setLoading(false); }
      }
    }
    void init();
    return () => { active = false; };
  }, []);

  const loadReport = useCallback(async () => {
    if (!businessId) return;
    const duration = lastDayCount(dates.from, dates.to);
    if (!Number.isFinite(duration) || duration < 1 || duration > 366) {
      setReport(null);
      setLoading(false);
      setError("Select a valid date range of 1 to 366 days.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await fetchAnalytics({
        businessId,
        ...(branchId !== "all" ? { branchId } : {}),
        from: dates.from, to: dates.to, granularity: dates.granularity,
      });
      setReport(data);
    } catch (cause) {
      setReport(null);
      setError(cause instanceof Error ? cause.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [businessId, branchId, dates.from, dates.to, dates.granularity]);

  useEffect(() => {
    if (!businessId) return;
    let active = true;
    setLoading(true);
    setError("");
    const days = lastDayCount(dates.from, dates.to);
    if (days < 1 || days > 366 || !Number.isFinite(days)) {
      setReport(null);
      setError("Select a valid date range of 1 to 366 days.");
      setLoading(false);
      return;
    }
    fetchAnalytics({
      businessId,
      ...(branchId !== "all" ? { branchId } : {}),
      from: dates.from, to: dates.to, granularity: dates.granularity,
    }).then((result) => {
      if (active) { setReport(result); setError(""); }
    }).catch((cause) => {
      if (active) { setReport(null); setError(cause instanceof Error ? cause.message : "Unable to load analytics."); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId, branchId, dates.from, dates.to, dates.granularity, reloadKey]);

  useEffect(() => {
    const update = () => setReloadKey((k) => k + 1);
    const changedBranch = () => {
      const selected = localStorage.getItem("selectedBranchId") ?? "";
      const branch = currentBusiness?.branches.find((item) => item.id === selected);
      if (branch) setBranchId(branch.id);
      setReloadKey((k) => k + 1);
    };
    window.addEventListener("focus", update);
    window.addEventListener("branchChanged", changedBranch);
    return () => {
      window.removeEventListener("focus", update);
      window.removeEventListener("branchChanged", changedBranch);
    };
  }, [currentBusiness]);

  function downloadReport() {
    if (!report || loading) return;
    const rows = csvRows(report);
    const safe = (value: string) => {
      const text = /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    const csv = "\ufeff" + rows.map((line) => line.map(safe).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "kassa-report-" + report.scope.from + "-to-" + report.scope.to + ".csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const metrics = report?.summary;
  const change = metrics?.salesChangePercent == null ? "No comparable prior-period sales" :
    (metrics.salesChangePercent >= 0 ? "+" : "") + metrics.salesChangePercent.toFixed(2) + "% vs preceding period";

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <KassaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}/>
      <main className="min-h-screen lg:ml-[198px]">
        <header className="flex min-h-[80px] items-center justify-between gap-4 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} aria-label="Open menu"
              className="shrink-0 rounded-md p-1.5 text-gray-600 lg:hidden">
              <Menu size={22}/>
            </button>
            <h1 className="truncate text-[18px] font-bold text-[#182033] sm:text-[20px] lg:text-[21px]">
              Reports &amp; Analytics
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <div className="hidden sm:block">
              <label className="sr-only" htmlFor="report-branch">Report branch</label>
              <select id="report-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}
                className="h-[34px] w-[150px] rounded-[9px] border border-[#D8DCE3] bg-white px-2 text-xs text-[#374151] lg:w-[162px]">
                {owner && <option value="all">All branches</option>}
                {selectableBranches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}{!branch.isActive ? " (inactive)" : ""}</option>)}
              </select>
            </div>
            <span aria-label="Notifications" className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50"><Bell size={17} className="text-gray-400"/></span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-800">AO</div>
          </div>
        </header>

        <div className="mb-6 mt-4 flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex max-w-full overflow-x-auto rounded-lg border border-gray-200 bg-white p-1">
            {rangeTabs.map((item) => (
              <button key={item} onClick={() => setRange(item)}
                className={"whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors " +
                  (range === item ? "bg-emerald-800 text-white" : "text-gray-500 hover:text-gray-700")}>
                {item}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void loadReport()} disabled={!businessId || loading}
              aria-label="Refresh report" title="Refresh report"
              className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw size={16}/>
            </button>
            <button type="button" disabled={!report || loading} onClick={downloadReport}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              <Download size={16}/> Download Report
            </button>
          </div>
        </div>

        {range === "Custom range" && (
          <div className="relative z-10 mb-5 flex flex-wrap items-end gap-3 px-4 sm:px-8">
            <label className="block text-xs text-gray-600">Quick range
              <select value={quick} onChange={(e) => setQuick(e.target.value as QuickRange)}
                className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm">
                {(["Last 30 days", "This quarter", "Year to date", "Custom dates"] as QuickRange[])
                  .map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label className="block text-xs text-gray-600">From
              <input type="date" value={dates.from} onChange={(e) => { setQuick("Custom dates"); setCustomFrom(e.target.value); }}
                className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"/>
            </label>
            <label className="block text-xs text-gray-600">To
              <input type="date" value={dates.to} onChange={(e) => { setQuick("Custom dates"); setCustomTo(e.target.value); }}
                className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"/>
            </label>
            <div className="sm:hidden">
              <label className="block text-xs text-gray-600">Branch
                <select value={branchId} onChange={(e) => setBranchId(e.target.value)}
                  className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                  {owner && <option value="all">All branches</option>}
                  {selectableBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </label>
            </div>
          </div>
        )}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 px-4 text-xs text-gray-500 sm:px-8">
          <span>Showing {dates.label}: {dates.from} – {dates.to} · {selectedBranch} · Africa/Lagos time</span>
          {report && <span>Updated {new Date(report.scope.generatedAt).toLocaleString("en-NG")}</span>}
        </div>
        {loading && <p role="status" className="mb-4 px-4 text-sm text-gray-600 sm:px-8">Loading real sales reports...</p>}
        {error && <p role="alert" className="mb-4 px-4 text-sm text-red-700 sm:px-8">{error}</p>}

        {report && (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 px-4 sm:px-8 lg:grid-cols-4">
              <SummaryCard label="Confirmed sales" value={formatMoney(metrics?.paidSales ?? "0")}
                sub={change}/>
              <SummaryCard label="Avg transaction value" value={formatMoney(metrics?.averageSale ?? "0")}
                sub={String(metrics?.paidTransactions ?? 0) + " paid transactions"}/>
              <SummaryCard label="Failed payment rate"
                value={metrics?.failedPaymentRate == null ? "N/A" : metrics.failedPaymentRate.toFixed(1) + "%"}
                sub={String(metrics?.failedPayments ?? 0) + " failed payment attempts"}/>
              <SummaryCard label={owner && branchId === "all" ? "Top branch" : "Total transactions"}
                value={owner && branchId === "all"
                  ? metrics?.topBranch?.name ?? "No sales yet"
                  : String(metrics?.totalTransactions ?? 0)}
                sub={owner && branchId === "all"
                  ? metrics?.topBranch ? metrics.topBranch.sharePct.toFixed(1) + "% of confirmed revenue" : "No confirmed branch revenue"
                  : String(metrics?.pendingTransactions ?? 0) + " pending sales"}/>
            </div>
            <div className="mb-6 grid grid-cols-2 gap-4 px-4 sm:px-8 lg:grid-cols-3">
              <SummaryCard label="Paid transactions" value={String(metrics?.paidTransactions ?? 0)}/>
              <SummaryCard label="Pending sales" value={String(metrics?.pendingTransactions ?? 0)}
                sub="Not included in confirmed sales"/>
              <SummaryCard label="Previous period sales" value={formatMoney(metrics?.previousPaidSales ?? "0")}/>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 px-4 sm:px-8 lg:grid-cols-3">
              <StackedTrendChart report={report}/>
              <ChannelBreakdown report={report}/>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 px-4 sm:px-8 xl:grid-cols-2">
              <TablePanel title="Sales by staff member">
                <table className="w-full min-w-[450px] text-left text-sm">
                  <thead><tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                    <th className="pb-3 pr-3 font-medium">Staff</th>
                    <th className="pb-3 pr-3 font-medium">Paid transactions</th>
                    <th className="pb-3 pr-3 font-medium">Confirmed sales</th>
                    <th className="pb-3 font-medium">Failed</th>
                  </tr></thead>
                  <tbody>
                    {report.staff.map((staff) => <tr key={staff.id ?? staff.name} className="border-b border-gray-50 last:border-0">
                      <td className="whitespace-nowrap py-3 pr-3 text-gray-700">{staff.name}</td>
                      <td className="py-3 pr-3 text-gray-700">{staff.paidTransactions}</td>
                      <td className="whitespace-nowrap py-3 pr-3 font-medium text-gray-900">{formatMoney(staff.paidSales)}</td>
                      <td className="py-3 text-red-600">{staff.failedPayments}</td>
                    </tr>)}
                    {!report.staff.length && <tr><td colSpan={4} className="py-7 text-center text-gray-500">No recorded staff sales.</td></tr>}
                  </tbody>
                </table>
              </TablePanel>
              <TablePanel title="Branch performance">
                <table className="w-full min-w-[350px] text-left text-sm">
                  <thead><tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                    <th className="pb-3 pr-3 font-medium">Branch</th>
                    <th className="pb-3 pr-3 font-medium">Paid transactions</th>
                    <th className="pb-3 font-medium">Confirmed sales</th>
                  </tr></thead>
                  <tbody>
                    {report.branches.map((branch) => <tr key={branch.id} className="border-b border-gray-50 last:border-0">
                      <td className="whitespace-nowrap py-3 pr-3 text-gray-700">{branch.name}</td>
                      <td className="py-3 pr-3 text-gray-700">{branch.paidTransactions}</td>
                      <td className="whitespace-nowrap py-3 font-medium text-gray-900">{formatMoney(branch.amount)}</td>
                    </tr>)}
                    {!report.branches.length && <tr><td colSpan={3} className="py-7 text-center text-gray-500">No branches found.</td></tr>}
                  </tbody>
                </table>
              </TablePanel>
            </div>
            <div className="mb-6 px-4 sm:px-8">
              <TablePanel title="Top-selling products (confirmed sales)">
                <table className="w-full min-w-[440px] text-left text-sm">
                  <thead><tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                    <th className="pb-3 pr-4 font-medium">Product</th>
                    <th className="pb-3 pr-4 font-medium">Units sold</th>
                    <th className="pb-3 font-medium">Confirmed sales</th>
                  </tr></thead>
                  <tbody>
                    {report.products.map((product) => <tr key={product.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4 text-gray-700">{product.name}</td>
                      <td className="py-3 pr-4 text-gray-700">{product.unitsSold}</td>
                      <td className="py-3 font-medium text-gray-900">{formatMoney(product.paidSales)}</td>
                    </tr>)}
                    {!report.products.length && <tr><td colSpan={3} className="py-7 text-center text-gray-500">No paid product sales in this period.</td></tr>}
                  </tbody>
                </table>
              </TablePanel>
            </div>
            <p className="mb-8 px-4 text-xs leading-6 text-gray-500 sm:px-8">
              Confirmed gross sales are not profit or bank-settled funds. Only paid sales with a successful payment
              count as revenue; unverified electronic payments stay pending. The report groups transactions by
              sale creation date in Africa/Lagos, using each sale&apos;s current status. Failed payment rate excludes
              pending attempts. Exported CSV uses the same date and branch filters.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
