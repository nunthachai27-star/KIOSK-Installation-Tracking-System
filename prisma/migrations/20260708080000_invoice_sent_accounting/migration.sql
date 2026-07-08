-- AlterEnum: add "ส่งเอกสารให้แผนกบัญชีแล้ว" invoice status (idempotent — pre-applied on the DB).
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'SENT_TO_ACCOUNTING';
