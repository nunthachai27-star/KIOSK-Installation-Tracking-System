-- ทะเบียนยืม-คืน (Loan): lend individual stock units, tracked by serial.
-- An open loan parks its StockItem in BORROWED so the stock board stops
-- counting it as available; returning the unit puts it back to IN_STOCK.
ALTER TYPE "StockStatus" ADD VALUE IF NOT EXISTS 'BORROWED';

CREATE TYPE "LoanStatus" AS ENUM ('BORROWED', 'RETURNED');

CREATE TABLE "Loan" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "borrowerName" TEXT NOT NULL,
  "borrowerPhone" TEXT NOT NULL,
  "borrowerOrg" TEXT,
  "purpose" TEXT,
  "borrowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "returnedAt" TIMESTAMP(3),
  "returnNote" TEXT,
  "status" "LoanStatus" NOT NULL DEFAULT 'BORROWED',
  "recordedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Loan_itemId_idx" ON "Loan"("itemId");
CREATE INDEX "Loan_status_idx" ON "Loan"("status");
CREATE INDEX "Loan_dueDate_idx" ON "Loan"("dueDate");

ALTER TABLE "Loan" ADD CONSTRAINT "Loan_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
