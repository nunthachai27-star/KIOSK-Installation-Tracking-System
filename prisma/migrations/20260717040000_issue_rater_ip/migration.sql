-- Audit the rater IP to detect self-rating / gaming.
ALTER TABLE "Issue" ADD COLUMN "raterIp" TEXT;
