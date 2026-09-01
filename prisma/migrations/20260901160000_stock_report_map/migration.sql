-- ตารางแมปสำหรับรายงานคงเหลือตามประเภทสินค้า (แยกต่างหาก ไม่กระทบตารางเดิม)
CREATE TABLE IF NOT EXISTS "StockReportMap" (
  "id"             TEXT PRIMARY KEY,
  "componentId"    TEXT NOT NULL,
  "stockProductId" TEXT NOT NULL,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "StockReportMap_componentId_key" ON "StockReportMap"("componentId");
