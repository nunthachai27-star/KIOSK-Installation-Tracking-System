-- Public borrow-request queue (draft loans submitted via QR/link, approved by staff).
CREATE TYPE "LoanRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "LoanRequest" (
  "id"            TEXT NOT NULL,
  "borrowerName"  TEXT NOT NULL,
  "borrowerPhone" TEXT NOT NULL,
  "borrowerOrg"   TEXT,
  "purpose"       TEXT,
  "dueDate"       TIMESTAMP(3),
  "status"        "LoanRequestStatus" NOT NULL DEFAULT 'PENDING',
  "note"          TEXT,
  "loanId"        TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoanRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LoanRequest_status_idx" ON "LoanRequest"("status");
