-- KASSA SaaS subscription billing. Additive; no changes to merchant checkout,
-- existing payments, inventory, account membership, or staff permissions.
CREATE TABLE "SubscriptionCharge" (
  "id" UUID NOT NULL,
  "businessId" UUID NOT NULL,
  "planCode" VARCHAR(48) NOT NULL,
  "planName" VARCHAR(80) NOT NULL,
  "durationDays" INTEGER NOT NULL,
  "amountKobo" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
  "reference" VARCHAR(70) NOT NULL,
  "checkoutUrl" VARCHAR(512),
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "gatewayDomain" VARCHAR(8) NOT NULL DEFAULT 'test',
  "providerTxnId" VARCHAR(80),
  "confirmedAt" TIMESTAMP(3),
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionCharge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SubscriptionCharge_reference_key" ON "SubscriptionCharge"("reference");
CREATE UNIQUE INDEX "SubscriptionCharge_providerTxnId_key" ON "SubscriptionCharge"("providerTxnId");
CREATE INDEX "SubscriptionCharge_businessId_createdAt_idx" ON "SubscriptionCharge"("businessId", "createdAt");
CREATE INDEX "SubscriptionCharge_businessId_status_periodEnd_idx" ON "SubscriptionCharge"("businessId", "status", "periodEnd");
CREATE UNIQUE INDEX "SubscriptionCharge_one_pending_per_business_idx"
  ON "SubscriptionCharge"("businessId") WHERE "status" = 'PENDING';
ALTER TABLE "SubscriptionCharge" ADD CONSTRAINT "SubscriptionCharge_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
