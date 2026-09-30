-- สำเนารายงานค่าขนส่งรายเดือน (บันทึกจากแถบแบบฟอร์ม)
CREATE TABLE IF NOT EXISTS "ShipReportCopy" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "method" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "html" TEXT NOT NULL,
  "createdById" TEXT,
  "createdByName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShipReportCopy_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ShipReportCopy_year_month_idx" ON "ShipReportCopy"("year", "month");
CREATE INDEX IF NOT EXISTS "ShipReportCopy_createdAt_idx" ON "ShipReportCopy"("createdAt");
