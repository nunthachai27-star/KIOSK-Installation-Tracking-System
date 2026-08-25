-- เครื่องมือออกแบบปุ่ม Kiosk (สาธารณะ): แกลเลอรีดีไซน์ที่โรงพยาบาลส่งเข้ามา + สถิติการใช้งาน.
CREATE TABLE IF NOT EXISTS "KioskButtonDesign" (
    "id" TEXT NOT NULL,
    "hospital" TEXT NOT NULL,
    "styleJson" TEXT NOT NULL,
    "sampleText" TEXT NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KioskButtonDesign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "KioskButtonDesign_createdAt_idx" ON "KioskButtonDesign"("createdAt");
CREATE INDEX IF NOT EXISTS "KioskButtonDesign_hospital_idx" ON "KioskButtonDesign"("hospital");
CREATE INDEX IF NOT EXISTS "KioskButtonDesign_ip_createdAt_idx" ON "KioskButtonDesign"("ip", "createdAt");
