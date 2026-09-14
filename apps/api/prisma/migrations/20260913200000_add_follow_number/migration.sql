-- N° identificatorio persistido (folio) para cotizaciones y ventas.
-- Reemplaza el número aleatorio que se generaba al imprimir el PDF.

ALTER TABLE "Quote" ADD COLUMN "followNumber" INTEGER;
ALTER TABLE "Sale" ADD COLUMN "followNumber" INTEGER;

-- Backfill: asignar folios secuenciales (100000+) por tienda, en orden de creación.
WITH ranked_quotes AS (
  SELECT
    id,
    "storeId",
    100000 + row_number() OVER (PARTITION BY "storeId" ORDER BY "createdAt", id) AS fn
  FROM "Quote"
)
UPDATE "Quote" q
SET "followNumber" = r.fn
FROM ranked_quotes r
WHERE q.id = r.id;

WITH ranked_sales AS (
  SELECT
    id,
    "storeId",
    100000 + row_number() OVER (PARTITION BY "storeId" ORDER BY "createdAt", id) AS fn
  FROM "Sale"
)
UPDATE "Sale" s
SET "followNumber" = r.fn
FROM ranked_sales r
WHERE s.id = r.id;

-- La secuencia 'folio' (compartida por cotizaciones y ventas) arranca después del máximo asignado.
INSERT INTO "Sequence" ("storeId", "name", "value")
SELECT t."storeId", 'folio', MAX(t.fn) AS value
FROM (
  SELECT "storeId", "followNumber" AS fn FROM "Quote" WHERE "followNumber" IS NOT NULL
  UNION ALL
  SELECT "storeId", "followNumber" FROM "Sale" WHERE "followNumber" IS NOT NULL
) t
GROUP BY t."storeId"
ON CONFLICT ("storeId", "name") DO NOTHING;

-- Índices únicos por tienda.
CREATE UNIQUE INDEX "Quote_storeId_followNumber_key" ON "Quote"("storeId", "followNumber");
CREATE UNIQUE INDEX "Sale_storeId_followNumber_key" ON "Sale"("storeId", "followNumber");