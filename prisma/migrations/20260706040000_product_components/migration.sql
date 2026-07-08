-- AlterTable: allow free-text component serials (serialType optional, add label)
ALTER TABLE "SerialNumber" ALTER COLUMN "serialType" DROP NOT NULL;
ALTER TABLE "SerialNumber" ADD COLUMN "label" TEXT;

-- CreateTable
CREATE TABLE "ProductComponent" (
    "id" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "needsSerial" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductComponent_productType_idx" ON "ProductComponent"("productType");

-- CreateIndex
CREATE UNIQUE INDEX "ProductComponent_productType_name_key" ON "ProductComponent"("productType", "name");
