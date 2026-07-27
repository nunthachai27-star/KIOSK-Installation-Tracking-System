-- Timeline of "วิธีการแก้ไข" entries per claim
CREATE TABLE "IssueSolution" (
  "id" TEXT NOT NULL,
  "issueId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "text" TEXT NOT NULL,
  "authorName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IssueSolution_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "IssueSolution_issueId_idx" ON "IssueSolution"("issueId");
ALTER TABLE "IssueSolution" ADD CONSTRAINT "IssueSolution_issueId_fkey"
  FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Consolidate each existing claim's solution text into a single timeline entry.
INSERT INTO "IssueSolution" ("id", "issueId", "date", "text", "authorName", "createdAt")
SELECT gen_random_uuid()::text, i."id", COALESCE(i."updatedAt", i."createdAt"), i."solution", NULL, now()
FROM "Issue" i
WHERE i."solution" IS NOT NULL AND btrim(i."solution") <> '';
