-- ทะเบียนโรงพยาบาลที่ลงทะเบียนใช้เครื่องมือออกแบบปุ่ม Kiosk (ขึ้น log ตั้งแต่ลงทะเบียน).
CREATE TABLE IF NOT EXISTS "KioskHospital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KioskHospital_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "KioskHospital_name_key" ON "KioskHospital"("name");
CREATE INDEX IF NOT EXISTS "KioskHospital_lastSeenAt_idx" ON "KioskHospital"("lastSeenAt");
