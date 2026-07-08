-- CreateEnum
CREATE TYPE "SerialStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'PROBLEM');

-- AlterTable: QC step gets a staff member
ALTER TABLE "QcRecord" ADD COLUMN "staffId" TEXT;

-- CreateTable: Serial step record (staff + status)
CREATE TABLE "SerialRecord" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "staffId" TEXT,
    "status" "SerialStatus" NOT NULL DEFAULT 'PENDING',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SerialRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SerialRecord_jobId_key" ON "SerialRecord"("jobId");

-- AddForeignKey
ALTER TABLE "SerialRecord" ADD CONSTRAINT "SerialRecord_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SerialRecord" ADD CONSTRAINT "SerialRecord_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcRecord" ADD CONSTRAINT "QcRecord_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
