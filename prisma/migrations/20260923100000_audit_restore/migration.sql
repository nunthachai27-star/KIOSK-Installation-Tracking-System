-- เพิ่มฟิลด์สำหรับ "ย้อนคืน" (undo) ในหน้า log — เก็บ snapshot ค่าก่อน/หลัง (additive)
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "refTable" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "refId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "beforeJson" JSONB;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "afterJson" JSONB;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "restorable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "restoredAt" TIMESTAMP(3);
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "restoredBy" TEXT;
