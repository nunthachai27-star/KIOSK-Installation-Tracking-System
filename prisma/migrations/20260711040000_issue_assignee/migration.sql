-- Staff responsible for resolving the issue; the satisfaction rating attributes to them.
ALTER TABLE "Issue" ADD COLUMN "assignedToId" TEXT;
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: default the resolver to whoever reported/logged the issue.
UPDATE "Issue" SET "assignedToId" = "reporterId" WHERE "reporterId" IS NOT NULL;
