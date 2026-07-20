-- Sell price on stock products (preserves spare-part prices when merged into stock).
ALTER TABLE "StockProduct" ADD COLUMN "sellPrice" DECIMAL(65,30);
