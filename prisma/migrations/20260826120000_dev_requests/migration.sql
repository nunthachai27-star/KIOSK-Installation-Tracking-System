-- แถบ "พัฒนา" (Dev Requests) — คำขอแก้ไข/เพิ่มฟังก์ชัน จากทีมเทคนิค → ทีมพัฒนา
-- Idempotent: ปลอดภัยเมื่อ migrate deploy ซ้ำ / มีข้อมูลเดิมอยู่แล้ว. ไม่แตะตารางอื่น.

-- enums (กันซ้ำด้วย duplicate_object)
DO $$ BEGIN
  CREATE TYPE "DevReqType" AS ENUM ('BUG', 'FEATURE', 'UI', 'IMPROVEMENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "DevReqPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "DevReqStatus" AS ENUM ('NEW', 'REVIEWING', 'IN_PROGRESS', 'TESTING', 'DONE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "DevReqActor" AS ENUM ('STAFF', 'DEV');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ตารางคำขอ (code = SERIAL: เลขสั้นอัตโนมัติสำหรับแสดง DEV-xxx)
CREATE TABLE IF NOT EXISTS "DevRequest" (
  "id"           TEXT NOT NULL,
  "code"         SERIAL NOT NULL,
  "type"         "DevReqType" NOT NULL DEFAULT 'BUG',
  "priority"     "DevReqPriority" NOT NULL DEFAULT 'MEDIUM',
  "status"       "DevReqStatus" NOT NULL DEFAULT 'NEW',
  "product"      TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "detail"       TEXT NOT NULL,
  "steps"        TEXT,
  "expected"     TEXT,
  "links"        TEXT,
  "reporterName" TEXT,
  "reporterId"   TEXT,
  "ip"           TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DevRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DevRequest_code_key" ON "DevRequest"("code");
CREATE INDEX IF NOT EXISTS "DevRequest_status_idx" ON "DevRequest"("status");
CREATE INDEX IF NOT EXISTS "DevRequest_createdAt_idx" ON "DevRequest"("createdAt");

-- ไทม์ไลน์การดำเนินงาน (audit trail — คงประวัติแม้ผู้ใช้ถูกลบ)
CREATE TABLE IF NOT EXISTS "DevRequestEvent" (
  "id"         TEXT NOT NULL,
  "requestId"  TEXT NOT NULL,
  "actor"      "DevReqActor" NOT NULL DEFAULT 'STAFF',
  "actorName"  TEXT,
  "fromStatus" "DevReqStatus",
  "toStatus"   "DevReqStatus",
  "note"       TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DevRequestEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DevRequestEvent_requestId_idx" ON "DevRequestEvent"("requestId");

DO $$ BEGIN
  ALTER TABLE "DevRequestEvent"
    ADD CONSTRAINT "DevRequestEvent_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "DevRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- token ลับใบเดียวสำหรับลิงก์ทีมพัฒนา
CREATE TABLE IF NOT EXISTS "DevBoardToken" (
  "id"        TEXT NOT NULL,
  "token"     TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT,
  CONSTRAINT "DevBoardToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DevBoardToken_token_key" ON "DevBoardToken"("token");
