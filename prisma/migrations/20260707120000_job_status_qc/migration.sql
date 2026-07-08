-- Split "เตรียมสินค้า/QC" into a distinct QC stage.
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'QC' AFTER 'PREPARING';
