-- งานสรุปที่พิมพ์เองในหน้าสรุปงานรายวัน (เพิ่มล้วน, idempotent). ไม่แตะตารางอื่น.
CREATE TABLE IF NOT EXISTS "ReportEntry" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "userName"  TEXT,
  "dateKey"   TEXT NOT NULL,
  "heading"   TEXT NOT NULL,
  "detail"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ReportEntry_dateKey_idx" ON "ReportEntry"("dateKey");
CREATE INDEX IF NOT EXISTS "ReportEntry_userId_dateKey_idx" ON "ReportEntry"("userId", "dateKey");
