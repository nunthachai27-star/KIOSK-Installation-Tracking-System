-- Product line for standalone claims, so claims can be filtered by product type.
ALTER TABLE "Issue" ADD COLUMN "productType" TEXT;
