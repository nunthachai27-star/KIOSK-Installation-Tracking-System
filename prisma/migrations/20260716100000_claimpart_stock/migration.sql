-- Link claim parts to the stock product deducted from (คลังสินค้า กลุ่มอะไหล่).
ALTER TABLE "ClaimPart" ADD COLUMN "stockProductId" TEXT;
