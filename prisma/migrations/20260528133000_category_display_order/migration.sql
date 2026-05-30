ALTER TABLE "Category" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) - 1 AS rn
  FROM "Category"
)
UPDATE "Category"
SET "displayOrder" = ordered.rn
FROM ordered
WHERE "Category"."id" = ordered."id";
