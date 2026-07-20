-- Hospital satisfaction rating on the staff's resolution.
ALTER TYPE "IssueEventType" ADD VALUE IF NOT EXISTS 'RATED';
ALTER TABLE "Issue" ADD COLUMN "rating" INTEGER;
ALTER TABLE "Issue" ADD COLUMN "ratingComment" TEXT;
ALTER TABLE "Issue" ADD COLUMN "ratedAt" TIMESTAMP(3);
