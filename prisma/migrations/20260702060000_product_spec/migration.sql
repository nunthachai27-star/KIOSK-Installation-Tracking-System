-- CreateTable
CREATE TABLE "ProductChecklistItem" (
    "id" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSerialSlot" (
    "id" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "serialType" "SerialType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSerialSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductChecklistItem_productType_idx" ON "ProductChecklistItem"("productType");

-- CreateIndex
CREATE UNIQUE INDEX "ProductChecklistItem_productType_label_key" ON "ProductChecklistItem"("productType", "label");

-- CreateIndex
CREATE INDEX "ProductSerialSlot_productType_idx" ON "ProductSerialSlot"("productType");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSerialSlot_productType_serialType_key" ON "ProductSerialSlot"("productType", "serialType");
