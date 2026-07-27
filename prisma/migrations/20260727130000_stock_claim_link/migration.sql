-- Link a warehouse unit cut for a claim back to that claim.
ALTER TABLE "StockItem" ADD COLUMN IF NOT EXISTS "claimIssueId" TEXT;
