-- สถานะติดตาม + ไทม์ไลน์ของผู้สนใจโปรดัก (additive, idempotent).
ALTER TABLE "KioskLead" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'NEW';
ALTER TABLE "KioskLead" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "KioskLead_status_idx" ON "KioskLead"("status");

CREATE TABLE IF NOT EXISTS "KioskLeadNote" (
  "id"        TEXT NOT NULL,
  "leadId"    TEXT NOT NULL,
  "actorName" TEXT,
  "toStatus"  TEXT,
  "text"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KioskLeadNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "KioskLeadNote_leadId_idx" ON "KioskLeadNote"("leadId");

DO $$ BEGIN
  ALTER TABLE "KioskLeadNote"
    ADD CONSTRAINT "KioskLeadNote_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "KioskLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
