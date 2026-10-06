-- แจ้งปัญหา/คำแนะนำ (สาธารณะ)
CREATE TABLE IF NOT EXISTS "Feedback" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'fat',
  "detail" TEXT NOT NULL,
  "name" TEXT,
  "phone" TEXT,
  "wantCallback" BOOLEAN NOT NULL DEFAULT false,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "handledAt" TIMESTAMP(3),
  "handledBy" TEXT,
  CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Feedback_source_createdAt_idx" ON "Feedback"("source", "createdAt");
