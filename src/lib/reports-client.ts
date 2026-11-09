import { inventoryFetch } from "@/lib/inventory-client";

export type ReportGranularity = "day" | "week" | "month";
export type ReportChannel = "BANK_TRANSFER" | "POS" | "CASH" | "USSD" | "CARD" | "WALLET";

export type AnalyticsReport = {
  scope: {
    businessId: string;
    branchId: string | null;
    from: string;
    to: string;
    granularity: ReportGranularity;
    timezone: string;
    generatedAt: string;
  };
  summary: {
    paidSales: string;
    paidTransactions: number;
    averageSale: string;
    totalTransactions: number;
    pendingTransactions: number;
    failedPayments: number;
    failedPaymentRate: number | null;
    previousPaidSales: string;
    salesChangePercent: number | null;
    topBranch: { id: string; name: string; amount: string; paidTransactions: number; sharePct: number } | null;
  };
  trend: { period: string; channel: ReportChannel; amount: string; transactions: number }[];
  channels: { channel: ReportChannel; amount: string; paidTransactions: number; sharePct: number }[];
  staff: { id: string | null; name: string; paidTransactions: number; paidSales: string; failedPayments: number }[];
  branches: { id: string; name: string; amount: string; paidTransactions: number }[];
  products: { id: string; name: string; unitsSold: number; paidSales: string }[];
  notes: string[];
};

export function fetchAnalytics(filters: {
  businessId: string;
  branchId?: string;
  from: string;
  to: string;
  granularity: ReportGranularity;
}) {
  const search = new URLSearchParams(filters);
  return inventoryFetch<AnalyticsReport>("/api/reports/summary?" + search.toString());
}
