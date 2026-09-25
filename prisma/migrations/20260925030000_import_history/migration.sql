CREATE TABLE "Import" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionCount" INTEGER NOT NULL
);

ALTER TABLE "Transaction" ADD COLUMN "importId" TEXT REFERENCES "Import"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Transaction_importId_idx" ON "Transaction"("importId");
