export type Expense = {
  id: string;
  branchName: string;
  category: string;
  description: string;
  amount: string;
  spentAt: string;
  hasReceipt: boolean;
  receiptName: string | null;
  receiptMime: string | null;
};

export type ExpenseList = {
  items: Expense[];
  summary: {
    allTime: string;
    thisMonth: string;
    count: number;
    monthCount: number;
    periodMonth?: string;
    periodTotal?: string;
    previousPeriodTotal?: string;
    periodCount?: number;
    byCategoryForPeriod?: { category: string; amount: string }[];
    byCategory: { category: string; amount: string }[];
  };
  historyLimit?: number;
};

// Operating expenses only: inventory purchasing and restocking are separate workflows.
export const expenseCategories = [
  'Rent', 'Utilities', 'Salaries', 'Transport', 'Marketing',
  'Maintenance', 'Office supplies', 'Professional fees', 'Other',
] as const;

export type ExpenseCategory = (typeof expenseCategories)[number];

export function localDate(): string {
  const today = new Date();
  return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') +
    '-' + String(today.getDate()).padStart(2, '0');
}

export function formattedDate(isoDate: string): string {
  const date = new Date(isoDate + 'T12:00:00');
  return Number.isNaN(date.getTime()) ? isoDate :
    date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function expenseReceiptPath(businessId: string, expenseId: string): string {
  return 'expenses/' + encodeURIComponent(expenseId) +
    '/receipt?businessId=' + encodeURIComponent(businessId);
}

export function expenseError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function currentMonthKey(): string {
  return localDate().slice(0, 7);
}

// Keep chart colours attached to category names, not their amount-ranked
// position. The reference's green / amber / blue / purple palette is preserved
// as amounts and category ordering change between months.
const expenseChartColors: Record<string, string> = {
  'Inventory Purchase': '#24A96A',
  'Rent': '#3379F6',
  'Utilities': '#F7BD32',
  'Salaries': '#24A96A',
  'Transport': '#1DAA84',
  'Marketing': '#38B7A0',
  'Maintenance': '#65BDA7',
  'Office supplies': '#8ACDB6',
  'Professional fees': '#218F73',
  'Other': '#9C78F7',
};

export function expenseCategoryColor(category: string): string {
  return expenseChartColors[category] ?? '#24A96A';
}
