-- คลังสินค้า: บันทึกผู้ตัดจ่าย/จ่ายออก/ตัดเคลม + เวลาที่ตัดจริง เพื่อนำไปรวมในสรุปงานประจำวัน
ALTER TABLE "StockItem" ADD COLUMN IF NOT EXISTS "issuedAt" TIMESTAMP(3);
ALTER TABLE "StockItem" ADD COLUMN IF NOT EXISTS "issuedById" TEXT;
