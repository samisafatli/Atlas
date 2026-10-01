CREATE TABLE "NameRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contains" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "NameRule_contains_key" ON "NameRule"("contains");
