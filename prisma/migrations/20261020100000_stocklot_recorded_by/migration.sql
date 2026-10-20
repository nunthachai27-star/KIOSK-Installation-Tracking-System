-- คลังสินค้า: บันทึกผู้ลงรับเข้าคลัง เพื่อนำไปรวมในสรุปงานประจำวัน
ALTER TABLE "StockLot" ADD COLUMN IF NOT EXISTS "recordedById" TEXT;
