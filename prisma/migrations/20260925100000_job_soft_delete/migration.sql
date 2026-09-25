-- ถังขยะงาน (soft delete): เพิ่มฟิลด์ซ่อนงาน (additive, ไม่กระทบข้อมูลเดิม)
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
CREATE INDEX IF NOT EXISTS "Job_deletedAt_idx" ON "Job"("deletedAt");
