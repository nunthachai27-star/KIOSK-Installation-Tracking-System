-- Link claims/repairs to the spare parts they consumed.
ALTER TYPE "IssueEventType" ADD VALUE IF NOT EXISTS 'PART_USED';

CREATE TABLE "ClaimPart" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "sparePartId" TEXT,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(65,30),
    "stockDeducted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClaimPart_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClaimPart_issueId_idx" ON "ClaimPart"("issueId");

ALTER TABLE "ClaimPart" ADD CONSTRAINT "ClaimPart_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClaimPart" ADD CONSTRAINT "ClaimPart_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE SET NULL ON UPDATE CASCADE;
