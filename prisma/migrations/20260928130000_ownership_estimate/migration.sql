ALTER TABLE "Transaction" ADD COLUMN "ownershipEstimated" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "Category" ("id", "name", "type", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'Moradia', 'EXPENSE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "Category" WHERE "name" = 'Moradia — divisão estimada' AND "type" = 'EXPENSE')
AND NOT EXISTS (SELECT 1 FROM "Category" WHERE "name" = 'Moradia' AND "type" = 'EXPENSE');

UPDATE "Transaction" SET "ownershipEstimated" = true,
"categoryId" = (SELECT "id" FROM "Category" WHERE "name" = 'Moradia' AND "type" = 'EXPENSE')
WHERE "categoryId" IN (SELECT "id" FROM "Category" WHERE "name" = 'Moradia — divisão estimada' AND "type" = 'EXPENSE');

INSERT OR IGNORE INTO "CategoryRule" ("id", "contains", "categoryId", "enabled", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "contains", (SELECT "id" FROM "Category" WHERE "name" = 'Moradia' AND "type" = 'EXPENSE'), "enabled", "createdAt", "updatedAt"
FROM "CategoryRule" WHERE "categoryId" IN (SELECT "id" FROM "Category" WHERE "name" = 'Moradia — divisão estimada' AND "type" = 'EXPENSE');
DELETE FROM "CategoryRule" WHERE "categoryId" IN (SELECT "id" FROM "Category" WHERE "name" = 'Moradia — divisão estimada' AND "type" = 'EXPENSE');
DELETE FROM "Category" WHERE "name" = 'Moradia — divisão estimada' AND "type" = 'EXPENSE';
