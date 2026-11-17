-- Merchant-owned receiving bank accounts. This migration is additive and preserves
-- all existing business / sale / payment records. No transfers are executed by KASSA.
CREATE TABLE "MerchantBankAccount" (
  "id" UUID NOT NULL,
  "businessId" UUID NOT NULL,
  "bankName" VARCHAR(120) NOT NULL,
  "accountNumber" VARCHAR(10) NOT NULL,
  "accountName" VARCHAR(150) NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MerchantBankAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MerchantBankAccount_businessId_bankName_accountNumber_key"
  ON "MerchantBankAccount"("businessId", "bankName", "accountNumber");
CREATE INDEX "MerchantBankAccount_businessId_isDefault_idx"
  ON "MerchantBankAccount"("businessId", "isDefault");
CREATE UNIQUE INDEX "MerchantBankAccount_one_default_per_business_idx"
  ON "MerchantBankAccount"("businessId") WHERE "isDefault" = true;
ALTER TABLE "MerchantBankAccount" ADD CONSTRAINT "MerchantBankAccount_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
