-- Per-user colour theme preference (null = default "ส้ม BMS").
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "theme" TEXT;
