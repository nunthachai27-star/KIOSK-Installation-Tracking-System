-- แจ้งเตือนผู้สนใจ: ทำเครื่องหมายว่าเจ้าหน้าที่เปิดดูแล้วหรือยัง (additive, idempotent).
ALTER TABLE "KioskLead" ADD COLUMN IF NOT EXISTS "seenAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "KioskLead_seenAt_idx" ON "KioskLead"("seenAt");
