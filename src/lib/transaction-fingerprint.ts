import { createHash } from "node:crypto";
import type { TransactionType } from "./transaction-types";

export type FingerprintTransaction = {
  date: string;
  description: string;
  amountCents: string;
  accountId: string;
  type: TransactionType;
  sourceType?: string;
  externalId?: string | null;
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

export function previousTransactionFingerprint(
  transaction: FingerprintTransaction,
) {
  return `v2:${createHash("sha256")
    .update(
      `${legacyTransactionFingerprint(transaction)}\u001f${transaction.type}`,
    )
    .digest("hex")}`;
}

export function transactionFingerprint(transaction: FingerprintTransaction) {
  const source = transaction.sourceType ?? "BANK_STATEMENT";
  const identity = transaction.externalId
    ? [transaction.accountId, source, transaction.externalId]
    : [source, previousTransactionFingerprint(transaction)];
  return `v3:${createHash("sha256").update(JSON.stringify(identity)).digest("hex")}`;
}
