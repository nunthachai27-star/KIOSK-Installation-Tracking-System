-- Per-user dynamic background style (null = plain).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bg" TEXT;
