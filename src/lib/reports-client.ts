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

export class ReportsAccessError extends Error {
  constructor() {
    super("You do not have permission to view Reports & Analytics.");
    this.name = "ReportsAccessError";
  }
}

export async function fetchAnalytics(filters: {
  businessId: string;
  branchId?: string;
  from: string;
  to: string;
  granularity: ReportGranularity;
}): Promise<AnalyticsReport> {
  const search = new URLSearchParams(filters);
  let response: Response;
  try {
    response = await fetch("/api/reports/summary?" + search.toString(), {
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new Error("Cannot reach Kassa. Ensure your frontend and backend are running.");
  }
  const body: unknown = await response.json().catch(() => ({}));
  if (response.status === 403) throw new ReportsAccessError();
  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body
      ? (body as { message?: unknown }).message : null;
    throw new Error(
      typeof message === "string" ? message :
      Array.isArray(message) ? message.filter((item): item is string => typeof item === "string").join(". ") :
      "Unable to load your report.",
    );
  }
  return body as AnalyticsReport;
}
