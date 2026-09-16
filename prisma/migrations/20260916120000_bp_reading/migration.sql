-- ค่าที่รับจากเครื่องวัดความดัน (หน้าเดชบอร์ดทดสอบ) — เก็บถาวร ตารางใหม่แยก ไม่กระทบข้อมูลเดิม
CREATE TABLE IF NOT EXISTS "BpReading" (
  "id"        TEXT PRIMARY KEY,
  "device"    TEXT,
  "name"      TEXT,
  "idcard"    TEXT,
  "systolic"  INTEGER,
  "diastolic" INTEGER,
  "pulse"     INTEGER,
  "raw"       JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "BpReading_createdAt_idx" ON "BpReading"("createdAt");
