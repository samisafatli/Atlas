import { createHash } from "node:crypto";

export type FingerprintTransaction = {
  date: string;
  description: string;
  amountCents: string;
  accountId: string;
  type: "INCOME" | "EXPENSE";
};

export function legacyTransactionFingerprint(
  transaction: FingerprintTransaction,
) {
  const normalizedDescription = transaction.description
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
  const signature = [
    transaction.date,
    normalizedDescription,
    transaction.amountCents,
    transaction.accountId,
  ].join("\u001f");
  return createHash("sha256").update(signature).digest("hex");
}

export function transactionFingerprint(transaction: FingerprintTransaction) {
  return `v2:${createHash("sha256")
    .update(
      `${legacyTransactionFingerprint(transaction)}\u001f${transaction.type}`,
    )
    .digest("hex")}`;
}
