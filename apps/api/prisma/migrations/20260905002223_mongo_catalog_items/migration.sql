-- DropForeignKey
ALTER TABLE "QuoteItem" DROP CONSTRAINT "QuoteItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "SaleItem" DROP CONSTRAINT "SaleItem_productId_fkey";

-- DropIndex
DROP INDEX "QuoteItem_productId_idx";

-- DropIndex
DROP INDEX "SaleItem_productId_idx";

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "fuente" TEXT,
ALTER COLUMN "productId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "fuente" TEXT,
ALTER COLUMN "productId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "QuoteItem_productId_fuente_idx" ON "QuoteItem"("productId", "fuente");

-- CreateIndex
CREATE INDEX "SaleItem_productId_fuente_idx" ON "SaleItem"("productId", "fuente");
