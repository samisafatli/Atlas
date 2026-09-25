ALTER TABLE "Transaction" ADD COLUMN "fingerprint" TEXT;
CREATE UNIQUE INDEX "Transaction_fingerprint_key" ON "Transaction"("fingerprint");
