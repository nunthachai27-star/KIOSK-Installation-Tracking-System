-- Spare-parts inventory (คลังอะไหล่).
CREATE TABLE "SparePart" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "sellPrice" DECIMAL(65,30),
    "serviceFee1" DECIMAL(65,30),
    "serviceFee2" DECIMAL(65,30),
    "requiresOnsite" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "remark" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SparePart_pkey" PRIMARY KEY ("id")
);
