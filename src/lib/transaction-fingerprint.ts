import { createHash } from "node:crypto";
import type { TransactionType } from "./transaction-types";
import { isDebitPurchaseRefund } from "./transaction-types";

export type FingerprintTransaction = {
  date: string;
  description: string;
  amountCents: string;
  accountId: string;
  type: TransactionType;
  sourceType?: string;
  externalId?: string | null;
  occurrence?: number;
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
  // Ownership does not change the original bank identity.
  transaction = {
    ...transaction,
    type:
      transaction.type === "MOTHER_INCOME"
        ? "INCOME"
        : transaction.type.startsWith("MOTHER_")
          ? "EXPENSE"
          : transaction.type,
  };
  const source = transaction.sourceType ?? "BANK_STATEMENT";
  // Older bank imports called these credits INCOME. Keep their identity even
  // when the parser correctly classifies them as REFUND, including old months.
  if (
    source === "BANK_STATEMENT" &&
    transaction.type === "REFUND" &&
    isDebitPurchaseRefund(transaction.description)
  ) {
    transaction = { ...transaction, type: "INCOME" };
  }
  const identity = transaction.externalId
    ? [transaction.accountId, source, transaction.externalId]
    : [source, previousTransactionFingerprint(transaction)];
  const base = `v3:${createHash("sha256").update(JSON.stringify(identity)).digest("hex")}`;
  return !transaction.externalId && (transaction.occurrence ?? 1) > 1
    ? `${base}:occ:${transaction.occurrence}`
    : base;
}

// Number indistinguishable rows within each file, never across files in a batch.
// The first occurrence retains the existing fingerprint for older imports.
export function withImportOccurrences<T extends FingerprintTransaction>(
  rows: T[],
) {
  const counts = new Map<string, number>();
  return rows.map((row) => {
    const base = transactionFingerprint({ ...row, occurrence: 1 });
    const occurrence = row.externalId ? 1 : (counts.get(base) ?? 0) + 1;
    counts.set(base, occurrence);
    return { ...row, occurrence };
  });
}
