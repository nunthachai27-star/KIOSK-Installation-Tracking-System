-- Allow standalone claims (imported history) not linked to a job in this system.
ALTER TABLE "Issue" ALTER COLUMN "jobId" DROP NOT NULL;
ALTER TABLE "Issue" ADD COLUMN "hospitalName" TEXT;
ALTER TABLE "Issue" ADD COLUMN "machineSerial" TEXT;
