-- Issue tracking timeline: an immutable event log per issue.
CREATE TYPE "IssueEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'SOLUTION_UPDATED');

CREATE TABLE "IssueEvent" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "type" "IssueEventType" NOT NULL,
    "fromStatus" "IssueStatus",
    "toStatus" "IssueStatus",
    "note" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IssueEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IssueEvent_issueId_idx" ON "IssueEvent"("issueId");

ALTER TABLE "IssueEvent" ADD CONSTRAINT "IssueEvent_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
