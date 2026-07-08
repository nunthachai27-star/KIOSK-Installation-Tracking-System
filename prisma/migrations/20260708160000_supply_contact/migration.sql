-- Procurement (พัสดุ) contact — separate from the main IT/site contact.
ALTER TABLE "Job" ADD COLUMN "supplyContactName" TEXT;
ALTER TABLE "Job" ADD COLUMN "supplyContactPhone" TEXT;
