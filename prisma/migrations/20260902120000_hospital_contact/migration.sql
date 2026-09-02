-- ผู้ติดต่อของโรงพยาบาล (หลายคนได้) — ตารางใหม่แยก ไม่กระทบข้อมูล/ความผูกพันเดิม
-- code / address มีอยู่แล้วในตาราง Hospital (idempotent เผื่อบางสภาพแวดล้อม)
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "address" TEXT;

CREATE TABLE IF NOT EXISTS "HospitalContact" (
  "id"         TEXT PRIMARY KEY,
  "hospitalId" TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "phone"      TEXT,
  "position"   TEXT,
  "note"       TEXT,
  "sortOrder"  INTEGER NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "HospitalContact_hospitalId_idx" ON "HospitalContact"("hospitalId");
DO $$ BEGIN
  ALTER TABLE "HospitalContact" ADD CONSTRAINT "HospitalContact_hospitalId_fkey"
    FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
