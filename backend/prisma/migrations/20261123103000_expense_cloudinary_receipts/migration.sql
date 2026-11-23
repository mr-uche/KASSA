-- Non-destructive: do not remove existing receipt bytes.
ALTER TABLE "Expense" ADD COLUMN "receiptCloudinaryAssetId" VARCHAR(100);
