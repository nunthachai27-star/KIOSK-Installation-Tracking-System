-- Extend the issue module into a full serial-based warranty claim tracker.

-- New enums (fresh types — safe to CREATE in the migration transaction).
CREATE TYPE "IssueMethod" AS ENUM ('REMOTE', 'ONSITE');
CREATE TYPE "IssueWarranty" AS ENUM ('IN_WARRANTY', 'OUT_OF_WARRANTY', 'NOT_COVERED', 'UNKNOWN');

-- Expanded claim lifecycle statuses (idempotent — pre-applied on the DB).
ALTER TYPE "IssueStatus" ADD VALUE IF NOT EXISTS 'WAIT_CUSTOMER_RETURN';
ALTER TYPE "IssueStatus" ADD VALUE IF NOT EXISTS 'SENT_TO_SUPPLIER';
ALTER TYPE "IssueStatus" ADD VALUE IF NOT EXISTS 'SHIPPING_TO_CUSTOMER';
ALTER TYPE "IssueStatus" ADD VALUE IF NOT EXISTS 'WAIT_ONSITE';
ALTER TYPE "IssueStatus" ADD VALUE IF NOT EXISTS 'QUOTATION';
ALTER TYPE "IssueStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- New timeline event type.
ALTER TYPE "IssueEventType" ADD VALUE IF NOT EXISTS 'WARRANTY_SET';

-- Claim fields on Issue.
ALTER TABLE "Issue" ADD COLUMN "warrantyState" "IssueWarranty" NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "Issue" ADD COLUMN "method" "IssueMethod";
ALTER TABLE "Issue" ADD COLUMN "failedSerial" TEXT;
ALTER TABLE "Issue" ADD COLUMN "replacementSerial" TEXT;
ALTER TABLE "Issue" ADD COLUMN "cost" DECIMAL(65,30);
