-- เพิ่ม index ให้ตาราง Job เพื่อเร่ง query ที่กรองบ่อย (ไม่แตะข้อมูลใดๆ)
CREATE INDEX IF NOT EXISTS "Job_isPlanned_currentStatus_idx" ON "Job"("isPlanned","currentStatus");
CREATE INDEX IF NOT EXISTS "Job_currentStatus_idx" ON "Job"("currentStatus");
CREATE INDEX IF NOT EXISTS "Job_deliveryDueDate_idx" ON "Job"("deliveryDueDate");
CREATE INDEX IF NOT EXISTS "Job_createdAt_idx" ON "Job"("createdAt");
CREATE INDEX IF NOT EXISTS "Job_contractStartDate_idx" ON "Job"("contractStartDate");
