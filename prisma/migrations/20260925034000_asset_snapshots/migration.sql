CREATE TABLE "AssetSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotDate" DATETIME NOT NULL,
    "totalCents" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "AssetSnapshotValue" (
    "snapshotId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amountCents" BIGINT NOT NULL,
    PRIMARY KEY ("snapshotId", "accountId"),
    CONSTRAINT "AssetSnapshotValue_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "AssetSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetSnapshotValue_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AssetAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AssetSnapshot_snapshotDate_key" ON "AssetSnapshot"("snapshotDate");
CREATE INDEX "AssetSnapshot_snapshotDate_idx" ON "AssetSnapshot"("snapshotDate");
CREATE INDEX "AssetSnapshotValue_accountId_idx" ON "AssetSnapshotValue"("accountId");
