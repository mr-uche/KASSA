import { kassaPost } from "@/lib/kassa-client";

export type PaystackVerification = {
  saleId: string;
  saleStatus: string;
  paymentStatus: string;
  providerStatus: string;
  testMode: true;
  needsAttention: boolean;
};

export type PaystackReconciliation = {
  testMode: true;
  checked: number;
  paid: number;
  needsReview: number;
  results: Array<{
    reference: string;
    saleId?: string;
    saleStatus?: string;
    paymentStatus?: string;
    providerStatus: string;
    needsAttention?: boolean;
    error?: string;
  }>;
};

export async function startPaystackTestCheckout(saleId: string, email: string) {
  const result = await kassaPost<{
    saleId: string; authorizationUrl: string; reference: string; testMode: true;
  }>("/api/payments/paystack/initialize", { saleId, email });
  // Never redirect to a URL from a client-supplied payment method or arbitrary domain.
  const url = new URL(result.authorizationUrl);
  if (url.origin !== "https://checkout.paystack.com" ||
      url.username || url.password || result.testMode !== true) {
    throw new Error("Payment provider returned an invalid checkout URL.");
  }
  return result.authorizationUrl;
}

export function verifyPaystackTestPayment(saleId: string) {
  return kassaPost<PaystackVerification>("/api/payments/paystack/verify", { saleId });
}

export function reconcilePaystackTestPayments(businessId: string, branchId: string) {
  return kassaPost<PaystackReconciliation>("/api/payments/paystack/reconcile", {
    businessId, branchId, limit: 5,
  });
}
