-- CreateEnum
CREATE TYPE "PayoutSchedule" AS ENUM ('INSTANT', 'DAILY', 'WEEKLY');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "payoutSchedule" "PayoutSchedule" NOT NULL DEFAULT 'DAILY',
ADD COLUMN     "settlementAccountLast4" TEXT,
ADD COLUMN     "settlementBankName" TEXT,
ADD COLUMN     "staffCountEstimate" INTEGER;

-- CreateTable
CREATE TABLE "StaffOnboardingDraft" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffOnboardingDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffOnboardingDraft_businessId_idx" ON "StaffOnboardingDraft"("businessId");

-- AddForeignKey
ALTER TABLE "StaffOnboardingDraft" ADD CONSTRAINT "StaffOnboardingDraft_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
