-- Vira (Call Center) integration: link issues to Vira handoffs + inbound event log + outbound retry queue.
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "viraKind" TEXT;
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "viraRef" TEXT;
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "viraInfo" JSONB;
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "viraClosedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "Issue_viraRef_key" ON "Issue"("viraRef");

CREATE TABLE IF NOT EXISTS "ViraEvent" (
  "id" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3),
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ViraEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ViraEvent_createdAt_idx" ON "ViraEvent"("createdAt");

CREATE TABLE IF NOT EXISTS "ViraOutbox" (
  "id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "body" JSONB NOT NULL,
  "issueId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "nextAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ViraOutbox_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ViraOutbox_status_nextAt_idx" ON "ViraOutbox"("status", "nextAt");
CREATE INDEX IF NOT EXISTS "ViraOutbox_issueId_idx" ON "ViraOutbox"("issueId");
