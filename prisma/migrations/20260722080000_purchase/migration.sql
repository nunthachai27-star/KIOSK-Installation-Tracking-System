-- งานจัดซื้อ (Purchase): standalone procurement tracking.
CREATE TYPE "PurchaseStatus" AS ENUM ('REQUESTED', 'APPROVED', 'ORDERED', 'SHIPPING', 'RECEIVED', 'CANCELLED');

CREATE TABLE "Purchase" (
  "id" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "category" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit" TEXT NOT NULL DEFAULT 'ชิ้น',
  "vendor" TEXT,
  "price" DECIMAL(65,30),
  "status" "PurchaseStatus" NOT NULL DEFAULT 'REQUESTED',
  "note" TEXT,
  "neededDate" TIMESTAMP(3),
  "orderedDate" TIMESTAMP(3),
  "receivedDate" TIMESTAMP(3),
  "requestedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Purchase_status_idx" ON "Purchase"("status");

ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
