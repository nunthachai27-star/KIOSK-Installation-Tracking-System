-- AlterTable: component serials link to their BMS unit
ALTER TABLE "SerialNumber" ADD COLUMN "parentId" TEXT;

-- CreateIndex
CREATE INDEX "SerialNumber_parentId_idx" ON "SerialNumber"("parentId");

-- AddForeignKey
ALTER TABLE "SerialNumber" ADD CONSTRAINT "SerialNumber_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SerialNumber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: per-unit QC
CREATE TABLE "UnitQc" (
    "id" TEXT NOT NULL,
    "serialId" TEXT NOT NULL,
    "staffId" TEXT,
    "status" "QcStatus" NOT NULL DEFAULT 'PENDING',
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitQc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnitQc_serialId_key" ON "UnitQc"("serialId");

-- AddForeignKey
ALTER TABLE "UnitQc" ADD CONSTRAINT "UnitQc_serialId_fkey" FOREIGN KEY ("serialId") REFERENCES "SerialNumber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitQc" ADD CONSTRAINT "UnitQc_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
