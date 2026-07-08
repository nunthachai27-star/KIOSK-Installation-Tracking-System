-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('RECEIVED', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "serialId" TEXT,
    "title" TEXT NOT NULL,
    "solution" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'RECEIVED',
    "reporterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Issue_jobId_idx" ON "Issue"("jobId");

-- CreateIndex
CREATE INDEX "Issue_status_idx" ON "Issue"("status");

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_serialId_fkey" FOREIGN KEY ("serialId") REFERENCES "SerialNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
