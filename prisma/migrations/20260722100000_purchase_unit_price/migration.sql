-- Add per-unit price to Purchase
ALTER TABLE "Purchase" ADD COLUMN "unitPrice" DECIMAL(65,30);
