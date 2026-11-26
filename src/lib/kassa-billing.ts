export type BillingEntitlement = {
  tier: "free" | "monthly" | "quarterly" | "annual" | "starter" | "growth" | "business" | "enterprise";
  ownerIncluded?: boolean;
  maxBranches: number; maxStaff: number;
  features: { customers: boolean; reports: boolean; grossProfit: boolean; dataExport: boolean };
};
export type BillingCycle = 'monthly' | 'quarterly' | 'annual';
export type BillingPlan = {
  code: string; name: string; amountKobo: number; durationDays: number;
  testPricing: boolean; entitlement: BillingEntitlement;
  tier?: string; tierName?: string; billingCycle?: BillingCycle;
  discountPercent?: number; savingsKobo?: number; monthlyEquivalentKobo?: number;
};
export type BillingCharge = {
  id: string; reference: string; planName: string; amountKobo: number;
  durationDays: number; status: string; environment: "test" | "live";
  confirmedAt: string | null; periodEnd: string | null; createdAt: string;
};
export type BillingStatus = {
  configured: boolean; environment: "test" | "live" | null;
  currency: "NGN"; plans: BillingPlan[];
  entitlement: BillingEntitlement & { expiresAt: string | null };
  featureRestrictionsEnabled: boolean;
  subscription: { status: "ACTIVE" | "EXPIRED" | "NOT_ACTIVE"; planName: string | null; expiresAt: string | null };
  scheduled?: { planName: string; startsAt: string | null } | null;
  pending: (BillingCharge & { checkoutUrl: string | null }) | null;
  history: BillingCharge[];
  automaticRenewal: false;
};

async function billingFetch<T>(path: string, method: "GET" | "POST", body?: object): Promise<T> {
  const response = await fetch("/api/billing/" + path, {
    method, credentials: "same-origin", cache: "no-store",
    ...(body ? { headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body) } : {}),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const msg = payload && typeof payload === "object" && "message" in payload
      ? (payload as { message: unknown }).message : null;
    throw new Error(typeof msg === "string" ? msg :
      Array.isArray(msg) ? msg.join(". ") : "Subscription billing request failed");
  }
  return payload as T;
}

export function loadBilling(businessId: string): Promise<BillingStatus> {
  return billingFetch<BillingStatus>("status?businessId=" + encodeURIComponent(businessId), "GET");
}

export async function beginSubscription(businessId: string, planCode: string) {
  const result = await billingFetch<{
    reference: string; authorizationUrl: string; environment: "test" | "live";
  }>("initialize", "POST", { businessId, planCode });
  const url = new URL(result.authorizationUrl);
  if (url.origin !== "https://checkout.paystack.com" || url.username || url.password) {
    throw new Error("Paystack returned an unexpected checkout URL");
  }
  return result;
}

export function verifySubscription(businessId: string, reference: string) {
  return billingFetch<{ reference: string; status: string; expiresAt: string | null }>(
    "verify", "POST", { businessId, reference });
}
