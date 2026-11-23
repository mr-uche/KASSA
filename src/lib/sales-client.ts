import { inventoryFetch, kassaPost, type InventoryContext, type InventoryProduct } from "@/lib/inventory-client";

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "POS" | "CARD" | "USSD" | "WALLET";
export type SaleDraft = {
  businessId: string;
  branchId: string;
  clientRequestId: string;
  channel: PaymentMethod;
  customerId?: string;
  items: { productId: string; quantity: number }[];
};

export type SavedSale = {
  id: string;
  reference: string;
  businessId: string;
  branchId: string;
  status: "DRAFT" | "PENDING_PAYMENT" | "PAID" | "CANCELLED" | "REFUNDED" | "PARTIALLY_REFUNDED";
  subtotal: string;
  discount: string;
  total: string;
  currency: string;
  createdAt: string;
  cashier: string;
  customerId: string | null;
  customer: string;
  items: {
    id: string;
    productId: string;
    name: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }[];
  payments: {
    id: string;
    reference: string;
    channel: PaymentMethod;
    status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "CANCELLED";
    confirmedAt: string | null;
    provider?: string | null;
    providerReference?: string | null;
  }[];
};

export function listSales(context: InventoryContext): Promise<SavedSale[]> {
  const search = new URLSearchParams({ businessId: context.businessId, branchId: context.branchId });
  return inventoryFetch<SavedSale[]>("/api/sales?" + search);
}
export function getSale(id: string): Promise<SavedSale> {
  return inventoryFetch<SavedSale>("/api/sales/" + encodeURIComponent(id));
}
export function createSale(draft: SaleDraft): Promise<SavedSale> {
  return kassaPost<SavedSale>("/api/sales", draft);
}
export function confirmCash(id: string): Promise<SavedSale> {
  return kassaPost<SavedSale>("/api/sales/" + encodeURIComponent(id) + "/confirm-cash", {
    cashReceived: true,
  });
}

/** One-tap staff attestation; never described as independent bank verification. */
export function confirmMerchantPayment(id: string, bankAccountId?: string): Promise<SavedSale> {
  return kassaPost<SavedSale>("/api/sales/" + encodeURIComponent(id) + "/confirm-merchant-payment", {
    confirmedReceived: true,
    ...(bankAccountId ? { bankAccountId } : {}),
  });
}

export type CheckoutReceivingAccount = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  isDefault: boolean;
};

export function listReceivingAccounts(context: Pick<InventoryContext, "businessId" | "branchId">): Promise<CheckoutReceivingAccount[]> {
  const query = new URLSearchParams({ businessId: context.businessId, branchId: context.branchId });
  return inventoryFetch<CheckoutReceivingAccount[]>("/api/sales/receiving-accounts?" + query);
}

export type PaymentVerificationStatus = {
  status: "NOT_CONNECTED" | "STAFF_CONFIRMED" | "HISTORICAL_TEST" | "PAID";
  saleStatus: string;
  paymentStatus: string;
  independentlyVerified: boolean;
  detail: string;
};

export function getPaymentVerificationStatus(saleId: string): Promise<PaymentVerificationStatus> {
  return inventoryFetch<PaymentVerificationStatus>("/api/sales/" + encodeURIComponent(saleId) + "/verification-status");
}
export function saleStatusLabel(status: SavedSale["status"]) {
  if (status === "PAID") return "Success";
  if (status === "PENDING_PAYMENT" || status === "DRAFT") return "Pending";
  return status === "CANCELLED" ? "Cancelled" : status === "REFUNDED" ? "Refunded" : "Partial refund";
}

export function listCheckoutProducts(context: InventoryContext): Promise<InventoryProduct[]> {
  const search = new URLSearchParams({
    businessId: context.businessId,
    branchId: context.branchId,
  });
  return inventoryFetch<InventoryProduct[]>("/api/sales/catalog?" + search.toString());
}
