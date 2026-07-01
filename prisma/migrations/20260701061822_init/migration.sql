-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OFFICE', 'FIELD', 'ADMIN', 'TECHNICIAN', 'EXECUTIVE', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DATA_ENTRY', 'PREPARING', 'READY_TO_SHIP', 'INSTALLING', 'HANDED_OVER', 'WAIT_INVOICE', 'CLOSED', 'PROBLEM', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SerialType" AS ENUM ('BMS', 'KIOSK', 'UPS', 'MINI_PC', 'SMART_CARD_READER', 'PRINTER', 'KEY_ID');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SCHEDULED', 'SHIPPING', 'ARRIVED', 'DELAYED', 'PROBLEM');

-- CreateEnum
CREATE TYPE "InstallType" AS ENUM ('REMOTE', 'ONSITE', 'REMOTE_ONSITE');

-- CreateEnum
CREATE TYPE "InstallStatus" AS ENUM ('PENDING', 'SCHEDULED', 'INSTALLING', 'DONE', 'FAILED', 'PROBLEM', 'POSTPONED');

-- CreateEnum
CREATE TYPE "QcStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "HandoverStatus" AS ENUM ('PENDING', 'RECEIVED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'ISSUED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('DELIVERY', 'REMOTE', 'ONSITE', 'TRAINING');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'DONE', 'POSTPONED', 'PROBLEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'FIELD',
    "avatarColor" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "healthRegion" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "remark" TEXT,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "jobCode" TEXT NOT NULL,
    "sourceLot" TEXT,
    "hospitalId" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "productModel" TEXT,
    "color" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "salesAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contractNo" TEXT,
    "contractStartDate" TIMESTAMP(3),
    "contractEndDate" TIMESTAMP(3),
    "deliveryDueDate" TIMESTAMP(3),
    "currentStatus" "JobStatus" NOT NULL DEFAULT 'DATA_ENTRY',
    "adminOwnerId" TEXT,
    "installerOwnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SerialNumber" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "serialType" "SerialType" NOT NULL,
    "serialNo" TEXT NOT NULL,
    "remark" TEXT,

    CONSTRAINT "SerialNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcRecord" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "QcStatus" NOT NULL DEFAULT 'PENDING',
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "remark" TEXT,

    CONSTRAINT "QcRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryRecord" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "shippedDate" TIMESTAMP(3),
    "arrivedDate" TIMESTAMP(3),
    "method" TEXT,
    "vehicle" TEXT,
    "trackingNo" TEXT,
    "estimatedCost" DECIMAL(65,30),
    "actualCost" DECIMAL(65,30),
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "remark" TEXT,

    CONSTRAINT "DeliveryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallationRecord" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "installType" "InstallType" NOT NULL DEFAULT 'REMOTE_ONSITE',
    "remoteDate" TIMESTAMP(3),
    "onsiteDate" TIMESTAMP(3),
    "result" TEXT,
    "problem" TEXT,
    "solution" TEXT,
    "status" "InstallStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "InstallationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoverRecord" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "checklistStatus" "HandoverStatus" NOT NULL DEFAULT 'PENDING',
    "checklistReceivedDate" TIMESTAMP(3),
    "handoverStatus" "HandoverStatus" NOT NULL DEFAULT 'PENDING',
    "handoverDate" TIMESTAMP(3),
    "remark" TEXT,

    CONSTRAINT "HandoverRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceRecord" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "invoiceDate" TIMESTAMP(3),
    "invoiceNo" TEXT,
    "invoiceAmount" DECIMAL(65,30),
    "remark" TEXT,

    CONSTRAINT "InvoiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobActivity" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "responsibleUserId" TEXT,
    "status" "ActivityStatus" NOT NULL DEFAULT 'PENDING',
    "remark" TEXT,

    CONSTRAINT "JobActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "refTable" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Job_jobCode_key" ON "Job"("jobCode");

-- CreateIndex
CREATE INDEX "SerialNumber_jobId_idx" ON "SerialNumber"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "QcRecord_jobId_key" ON "QcRecord"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryRecord_jobId_key" ON "DeliveryRecord"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "InstallationRecord_jobId_key" ON "InstallationRecord"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "HandoverRecord_jobId_key" ON "HandoverRecord"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceRecord_jobId_key" ON "InvoiceRecord"("jobId");

-- CreateIndex
CREATE INDEX "JobActivity_activityDate_idx" ON "JobActivity"("activityDate");

-- CreateIndex
CREATE INDEX "Attachment_refTable_refId_idx" ON "Attachment"("refTable", "refId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_adminOwnerId_fkey" FOREIGN KEY ("adminOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_installerOwnerId_fkey" FOREIGN KEY ("installerOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SerialNumber" ADD CONSTRAINT "SerialNumber_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcRecord" ADD CONSTRAINT "QcRecord_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRecord" ADD CONSTRAINT "DeliveryRecord_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallationRecord" ADD CONSTRAINT "InstallationRecord_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverRecord" ADD CONSTRAINT "HandoverRecord_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceRecord" ADD CONSTRAINT "InvoiceRecord_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobActivity" ADD CONSTRAINT "JobActivity_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobActivity" ADD CONSTRAINT "JobActivity_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
