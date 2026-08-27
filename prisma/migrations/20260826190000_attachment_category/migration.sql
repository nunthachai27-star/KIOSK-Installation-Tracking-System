-- เพิ่มชนิดเอกสารให้ไฟล์แนบ (additive, idempotent). ของเดิมเป็น null — ไม่กระทบ.
ALTER TABLE "Attachment" ADD COLUMN IF NOT EXISTS "category" TEXT;
