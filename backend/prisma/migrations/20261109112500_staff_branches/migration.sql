ALTER TABLE "Branch"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT;

CREATE UNIQUE INDEX "Branch_businessId_code_key" ON "Branch"("businessId","code");

CREATE TABLE "StaffInvitation" (
  "id" UUID NOT NULL,
  "businessId" UUID NOT NULL,
  "roleId" UUID NOT NULL,
  "branchId" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "message" TEXT,
  "tokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "StaffInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StaffInvitation_tokenHash_key" ON "StaffInvitation"("tokenHash");
CREATE INDEX "StaffInvitation_businessId_email_idx" ON "StaffInvitation"("businessId","email");
CREATE INDEX "StaffInvitation_expiresAt_idx" ON "StaffInvitation"("expiresAt");
ALTER TABLE "StaffInvitation"
  ADD CONSTRAINT "StaffInvitation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffInvitation"
  ADD CONSTRAINT "StaffInvitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "BusinessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffInvitation"
  ADD CONSTRAINT "StaffInvitation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
