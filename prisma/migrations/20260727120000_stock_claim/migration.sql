-- New warehouse status for units cut out to fulfil a claim (excluded from "คงเหลือ").
ALTER TYPE "StockStatus" ADD VALUE IF NOT EXISTS 'CLAIM';

-- Link a claim part to the exact warehouse unit it consumed + snapshot its serial.
ALTER TABLE "ClaimPart" ADD COLUMN IF NOT EXISTS "stockItemId" TEXT;
ALTER TABLE "ClaimPart" ADD COLUMN IF NOT EXISTS "serialNo" TEXT;
