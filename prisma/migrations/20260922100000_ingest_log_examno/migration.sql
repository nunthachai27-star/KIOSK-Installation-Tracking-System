-- กัน 1F64 ส่งค่าเก่าซ้ำ: เก็บ examNo ต่อการวัด + index หา (device, examNo) เร็ว
ALTER TABLE "BpReading" ADD COLUMN IF NOT EXISTS "examNo" TEXT;
CREATE INDEX IF NOT EXISTS "BpReading_device_examNo_idx" ON "BpReading"("device", "examNo");

-- log การยิงข้อมูลเข้าเว็บ (สำหรับหน้ามอนิเตอร์ admin)
CREATE TABLE IF NOT EXISTS "IngestLog" (
  "id"        TEXT PRIMARY KEY,
  "kind"      TEXT NOT NULL,
  "device"    TEXT,
  "name"      TEXT,
  "ip"        TEXT,
  "status"    TEXT NOT NULL,
  "bytes"     INTEGER,
  "summary"   TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "IngestLog_createdAt_idx" ON "IngestLog"("createdAt");
