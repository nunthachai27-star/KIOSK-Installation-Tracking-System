-- Separate equipment claims (เคลมอุปกรณ์) from general problem reports (ปัญหาทั่วไป).
CREATE TYPE "IssueType" AS ENUM ('CLAIM', 'GENERAL');
ALTER TABLE "Issue" ADD COLUMN "issueType" "IssueType" NOT NULL DEFAULT 'CLAIM';
