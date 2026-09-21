-- ค่าที่รับจากเครื่องวัดไขมัน/องค์ประกอบร่างกาย (หน้าเดชบอร์ดทดสอบ) — เก็บถาวร ตารางใหม่แยก ไม่กระทบข้อมูลเดิม
CREATE TABLE IF NOT EXISTS "FatReading" (
  "id"        TEXT PRIMARY KEY,
  "device"    TEXT,
  "name"      TEXT,
  "idcard"    TEXT,
  "metrics"   JSONB,
  "raw"       JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "FatReading_createdAt_idx" ON "FatReading"("createdAt");
