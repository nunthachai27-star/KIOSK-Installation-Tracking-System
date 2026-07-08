-- CreateTable
CREATE TABLE "ProductBmsCode" (
    "id" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBmsCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductBmsCode_productType_key" ON "ProductBmsCode"("productType");
