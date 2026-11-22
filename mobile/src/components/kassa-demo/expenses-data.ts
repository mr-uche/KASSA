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

export const categoryColors = [
  '#0F6E56', '#36957E', '#78B99B', '#A5D3C2',
  '#DAA04B', '#B76A17', '#8B99A3', '#637D71', '#C5D9D0',
];
