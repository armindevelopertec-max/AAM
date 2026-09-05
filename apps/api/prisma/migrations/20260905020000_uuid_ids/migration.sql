-- Convertir IDs secuenciales a UUID preservando las relaciones existentes.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------
-- 1) Quitar FKs, índices y PK que dependen de las columnas integer
-- ---------------------------------------------------------------
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_storeId_fkey";
ALTER TABLE "Client" DROP CONSTRAINT IF EXISTS "Client_storeId_fkey";
ALTER TABLE "Sale" DROP CONSTRAINT IF EXISTS "Sale_storeId_fkey";
ALTER TABLE "SaleItem" DROP CONSTRAINT IF EXISTS "SaleItem_saleId_fkey";
ALTER TABLE "Quote" DROP CONSTRAINT IF EXISTS "Quote_storeId_fkey";
ALTER TABLE "QuoteItem" DROP CONSTRAINT IF EXISTS "QuoteItem_quoteId_fkey";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_storeId_fkey";
ALTER TABLE "Sequence" DROP CONSTRAINT IF EXISTS "Sequence_storeId_fkey";

DROP INDEX IF EXISTS "Product_storeId_sku_idx";
DROP INDEX IF EXISTS "Sale_storeId_number_key";
DROP INDEX IF EXISTS "Quote_storeId_number_key";
DROP INDEX IF EXISTS "User_storeId_idx";
DROP INDEX IF EXISTS "SaleItem_saleId_idx";
DROP INDEX IF EXISTS "QuoteItem_quoteId_idx";

ALTER TABLE "Sequence" DROP CONSTRAINT IF EXISTS "Sequence_pkey";

-- ---------------------------------------------------------------
-- 2) Asignar un UUID nuevo a cada id de las tablas padres
-- ---------------------------------------------------------------
ALTER TABLE "Store" ADD COLUMN "id2" UUID;
UPDATE "Store" SET "id2" = gen_random_uuid();

ALTER TABLE "Product" ADD COLUMN "id2" UUID;
UPDATE "Product" SET "id2" = gen_random_uuid();

ALTER TABLE "Client" ADD COLUMN "id2" UUID;
UPDATE "Client" SET "id2" = gen_random_uuid();

ALTER TABLE "Sale" ADD COLUMN "id2" UUID;
UPDATE "Sale" SET "id2" = gen_random_uuid();

ALTER TABLE "Quote" ADD COLUMN "id2" UUID;
UPDATE "Quote" SET "id2" = gen_random_uuid();

ALTER TABLE "User" ADD COLUMN "id2" UUID;
UPDATE "User" SET "id2" = gen_random_uuid();

ALTER TABLE "SaleItem" ADD COLUMN "id2" UUID;
UPDATE "SaleItem" SET "id2" = gen_random_uuid();

ALTER TABLE "QuoteItem" ADD COLUMN "id2" UUID;
UPDATE "QuoteItem" SET "id2" = gen_random_uuid();

-- ---------------------------------------------------------------
-- 3) Mapear los IDs antiguos (integer) a los nuevos UUID en las FKs
-- ---------------------------------------------------------------
ALTER TABLE "Product" ADD COLUMN "sid" UUID;
UPDATE "Product" p SET "sid" = s."id2" FROM "Store" s WHERE p."storeId" = s."id";

ALTER TABLE "Client" ADD COLUMN "sid" UUID;
UPDATE "Client" c SET "sid" = s."id2" FROM "Store" s WHERE c."storeId" = s."id";

ALTER TABLE "Sale" ADD COLUMN "sid" UUID;
UPDATE "Sale" sa SET "sid" = s."id2" FROM "Store" s WHERE sa."storeId" = s."id";

ALTER TABLE "Quote" ADD COLUMN "sid" UUID;
UPDATE "Quote" q SET "sid" = s."id2" FROM "Store" s WHERE q."storeId" = s."id";

ALTER TABLE "Sequence" ADD COLUMN "sid" UUID;
UPDATE "Sequence" se SET "sid" = s."id2" FROM "Store" s WHERE se."storeId" = s."id";

ALTER TABLE "User" ADD COLUMN "sid" UUID;
UPDATE "User" u SET "sid" = s."id2" FROM "Store" s WHERE u."storeId" = s."id";

ALTER TABLE "SaleItem" ADD COLUMN "saleNew" UUID;
UPDATE "SaleItem" si SET "saleNew" = sa."id2" FROM "Sale" sa WHERE si."saleId" = sa."id";

ALTER TABLE "QuoteItem" ADD COLUMN "quoteNew" UUID;
UPDATE "QuoteItem" qi SET "quoteNew" = q."id2" FROM "Quote" q WHERE qi."quoteId" = q."id";

-- clientId (sin FK, se mapea por valor; si no existe, queda NULL)
ALTER TABLE "Sale" ADD COLUMN "cid" UUID;
UPDATE "Sale" sa SET "cid" = c."id2" FROM "Client" c WHERE sa."clientId" = c."id";

ALTER TABLE "Quote" ADD COLUMN "cid" UUID;
UPDATE "Quote" q SET "cid" = c."id2" FROM "Client" c WHERE q."clientId" = c."id";

-- ---------------------------------------------------------------
-- 4) Convertir los id de las tablas padres a UUID
-- ---------------------------------------------------------------
ALTER TABLE "Store" DROP CONSTRAINT "Store_pkey";
ALTER TABLE "Store" DROP COLUMN "id";
ALTER TABLE "Store" RENAME COLUMN "id2" TO "id";
ALTER TABLE "Store" ADD CONSTRAINT "Store_pkey" PRIMARY KEY ("id");

ALTER TABLE "User" DROP CONSTRAINT "User_pkey";
ALTER TABLE "User" DROP COLUMN "id";
ALTER TABLE "User" RENAME COLUMN "id2" TO "id";
ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

ALTER TABLE "Product" DROP CONSTRAINT "Product_pkey";
ALTER TABLE "Product" DROP COLUMN "id";
ALTER TABLE "Product" RENAME COLUMN "id2" TO "id";
ALTER TABLE "Product" ADD CONSTRAINT "Product_pkey" PRIMARY KEY ("id");

ALTER TABLE "Client" DROP CONSTRAINT "Client_pkey";
ALTER TABLE "Client" DROP COLUMN "id";
ALTER TABLE "Client" RENAME COLUMN "id2" TO "id";
ALTER TABLE "Client" ADD CONSTRAINT "Client_pkey" PRIMARY KEY ("id");

ALTER TABLE "Sale" DROP CONSTRAINT "Sale_pkey";
ALTER TABLE "Sale" DROP COLUMN "id";
ALTER TABLE "Sale" RENAME COLUMN "id2" TO "id";
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_pkey" PRIMARY KEY ("id");

ALTER TABLE "Quote" DROP CONSTRAINT "Quote_pkey";
ALTER TABLE "Quote" DROP COLUMN "id";
ALTER TABLE "Quote" RENAME COLUMN "id2" TO "id";
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_pkey" PRIMARY KEY ("id");

ALTER TABLE "SaleItem" DROP CONSTRAINT "SaleItem_pkey";
ALTER TABLE "SaleItem" DROP COLUMN "id";
ALTER TABLE "SaleItem" RENAME COLUMN "id2" TO "id";
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id");

ALTER TABLE "QuoteItem" DROP CONSTRAINT "QuoteItem_pkey";
ALTER TABLE "QuoteItem" DROP COLUMN "id";
ALTER TABLE "QuoteItem" RENAME COLUMN "id2" TO "id";
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id");

-- ---------------------------------------------------------------
-- 5) Convertir las columnas de FK a UUID
-- ---------------------------------------------------------------
ALTER TABLE "Store" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "Product" DROP COLUMN "storeId";
ALTER TABLE "Product" RENAME COLUMN "sid" TO "storeId";
ALTER TABLE "Product" ALTER COLUMN "storeId" SET NOT NULL;

ALTER TABLE "Client" DROP COLUMN "storeId";
ALTER TABLE "Client" RENAME COLUMN "sid" TO "storeId";
ALTER TABLE "Client" ALTER COLUMN "storeId" SET NOT NULL;

ALTER TABLE "Sale" DROP COLUMN "storeId";
ALTER TABLE "Sale" RENAME COLUMN "sid" TO "storeId";
ALTER TABLE "Sale" ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "Sale" DROP COLUMN "clientId";
ALTER TABLE "Sale" RENAME COLUMN "cid" TO "clientId";

ALTER TABLE "Quote" DROP COLUMN "storeId";
ALTER TABLE "Quote" RENAME COLUMN "sid" TO "storeId";
ALTER TABLE "Quote" ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "Quote" DROP COLUMN "clientId";
ALTER TABLE "Quote" RENAME COLUMN "cid" TO "clientId";

ALTER TABLE "Sequence" DROP COLUMN "storeId";
ALTER TABLE "Sequence" RENAME COLUMN "sid" TO "storeId";
ALTER TABLE "Sequence" ALTER COLUMN "storeId" SET NOT NULL;

ALTER TABLE "User" DROP COLUMN "storeId";
ALTER TABLE "User" RENAME COLUMN "sid" TO "storeId";
ALTER TABLE "User" ALTER COLUMN "storeId" SET NOT NULL;

ALTER TABLE "SaleItem" DROP COLUMN "saleId";
ALTER TABLE "SaleItem" RENAME COLUMN "saleNew" TO "saleId";
ALTER TABLE "SaleItem" ALTER COLUMN "saleId" SET NOT NULL;

ALTER TABLE "QuoteItem" DROP COLUMN "quoteId";
ALTER TABLE "QuoteItem" RENAME COLUMN "quoteNew" TO "quoteId";
ALTER TABLE "QuoteItem" ALTER COLUMN "quoteId" SET NOT NULL;

-- ---------------------------------------------------------------
-- 6) Recrear índices, PK compuesta y FKs
-- ---------------------------------------------------------------
CREATE INDEX "Product_storeId_sku_idx" ON "Product"("storeId", "sku");
CREATE UNIQUE INDEX "Sale_storeId_number_key" ON "Sale"("storeId", "number");
CREATE UNIQUE INDEX "Quote_storeId_number_key" ON "Quote"("storeId", "number");
CREATE INDEX "User_storeId_idx" ON "User"("storeId");
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");
CREATE INDEX "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_pkey" PRIMARY KEY ("storeId", "name");

ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;