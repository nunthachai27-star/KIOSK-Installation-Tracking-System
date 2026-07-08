-- Attribute delivery / installation / handover / invoice work to the staff who
-- recorded it, so the daily report covers every workflow step.
ALTER TABLE "DeliveryRecord" ADD COLUMN "recordedById" TEXT;
ALTER TABLE "DeliveryRecord" ADD COLUMN "updatedAt" TIMESTAMP(3);
ALTER TABLE "InstallationRecord" ADD COLUMN "recordedById" TEXT;
ALTER TABLE "InstallationRecord" ADD COLUMN "updatedAt" TIMESTAMP(3);
ALTER TABLE "HandoverRecord" ADD COLUMN "recordedById" TEXT;
ALTER TABLE "HandoverRecord" ADD COLUMN "updatedAt" TIMESTAMP(3);
ALTER TABLE "InvoiceRecord" ADD COLUMN "recordedById" TEXT;
ALTER TABLE "InvoiceRecord" ADD COLUMN "updatedAt" TIMESTAMP(3);
