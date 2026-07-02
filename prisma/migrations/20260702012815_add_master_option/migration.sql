-- CreateTable
CREATE TABLE "MasterOption" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MasterOption_category_idx" ON "MasterOption"("category");

-- CreateIndex
CREATE UNIQUE INDEX "MasterOption_category_value_key" ON "MasterOption"("category", "value");
