-- ยืม-คืน: รองรับ "พิมพ์ Serial เอง" (ของที่ไม่ได้อยู่ในคลัง) → itemId ไม่บังคับ + เพิ่มช่องพิมพ์เอง
ALTER TABLE "Loan" ALTER COLUMN "itemId" DROP NOT NULL;
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "itemName" TEXT;
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "itemSerial" TEXT;
