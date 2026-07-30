-- Profile avatar: chosen emoji icon + uploaded photo (small data URL). avatarColor already exists.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarIcon" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
