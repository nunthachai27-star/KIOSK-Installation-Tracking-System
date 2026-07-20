-- Equipment stock (คลังสินค้า): serial-level finished-goods inventory.
CREATE TYPE "StockStatus" AS ENUM ('IN_STOCK', 'ISSUED');

CREATE TABLE "StockProduct" (
  "id" TEXT NOT NULL,
  "group" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'เครื่อง',
  "serialized" BOOLEAN NOT NULL DEFAULT true,
  "lowStockQty" INTEGER NOT NULL DEFAULT 3,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StockProduct_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StockProduct_group_name_key" ON "StockProduct"("group", "name");

CREATE TABLE "StockLot" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "lotCode" TEXT NOT NULL,
  "receivedQty" INTEGER NOT NULL DEFAULT 0,
  "receivedDate" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StockLot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StockLot_productId_idx" ON "StockLot"("productId");

CREATE TABLE "StockItem" (
  "id" TEXT NOT NULL,
  "lotId" TEXT NOT NULL,
  "seq" INTEGER,
  "serialBMS" TEXT,
  "serialNo" TEXT,
  "color" TEXT,
  "status" "StockStatus" NOT NULL DEFAULT 'IN_STOCK',
  "receivedDate" TIMESTAMP(3),
  "issuedDate" TIMESTAMP(3),
  "deliveredDate" TIMESTAMP(3),
  "hospitalName" TEXT,
  "hospitalId" TEXT,
  "jobId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StockItem_lotId_idx" ON "StockItem"("lotId");
CREATE INDEX "StockItem_status_idx" ON "StockItem"("status");
CREATE INDEX "StockItem_serialBMS_idx" ON "StockItem"("serialBMS");
CREATE INDEX "StockItem_hospitalId_idx" ON "StockItem"("hospitalId");

ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "StockProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "StockLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
