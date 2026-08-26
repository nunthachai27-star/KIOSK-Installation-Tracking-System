-- เพิ่มโน้ตหัวบอร์ด "ทีมพัฒนาคือใคร" ให้ตาราง token (additive, idempotent).
ALTER TABLE "DevBoardToken" ADD COLUMN IF NOT EXISTS "teamNote" TEXT;
