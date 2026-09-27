import type { prisma } from "./prisma-client.ts";
import { parseNubankCsv } from "./nubank-csv.ts";
import {
  legacyTransactionFingerprint,
  transactionFingerprint,
} from "./transaction-fingerprint.ts";
import { categoryType } from "./transaction-types.ts";

// Called only after the caller has saved a full protection backup.
export async function repairImport(
  client: typeof prisma,
  importId: string,
  csv: string,
) {
  const rows = parseNubankCsv(csv);
  if (!rows.length) throw new Error("CSV vazio.");
  return client.$transaction(
    async (tx) => {
      const record = await tx.import.findUniqueOrThrow({
        where: { id: importId },
        include: { transactions: { include: { category: true } } },
      });
      if (record.parserVersion >= 2)
        return { repaired: 0, alreadyCurrent: true };
      if (
        rows.length !== record.transactions.length ||
        record.transactionCount !== rows.length
      )
        throw new Error(
          "Quantidade diferente do lote original; reparo cancelado.",
        );
      const accountIds = new Set(
        record.transactions.map((row) => row.accountId),
      );
      if (accountIds.size !== 1)
        throw new Error("Lote com múltiplas contas; reparo cancelado.");
      const accountId = [...accountIds][0];
      const planned = rows.map((row) => {
        const oldType =
          row.sourceType === "CREDIT_CARD"
            ? row.type === "EXPENSE"
              ? "INCOME"
              : "EXPENSE"
            : row.type === "TRANSFER"
              ? "EXPENSE"
              : row.type;
        const key = legacyTransactionFingerprint({ ...row, accountId });
        const matches = record.transactions.filter(
          (stored) =>
            stored.type === oldType &&
            legacyTransactionFingerprint({
              date: stored.occurredAt.toISOString().slice(0, 10),
              description: stored.description,
              amountCents: stored.amountCents.toString(),
              accountId: stored.accountId,
              type: row.type,
            }) === key,
        );
        if (matches.length !== 1)
          throw new Error("Lançamento alterado ou ambíguo; reparo cancelado.");
        return {
          row,
          stored: matches[0],
          fingerprint: transactionFingerprint({ ...row, accountId }),
        };
      });
      if (new Set(planned.map((item) => item.stored.id)).size !== rows.length)
        throw new Error("Correspondência repetida; reparo cancelado.");
      for (const { row, stored, fingerprint } of planned) {
        await tx.transaction.update({
          where: { id: stored.id },
          data: {
            type: row.type,
            sourceType: row.sourceType,
            externalId: row.externalId,
            fingerprint,
            categoryId:
              stored.category?.type === categoryType(row.type)
                ? stored.categoryId
                : null,
          },
        });
      }
      await tx.import.update({
        where: { id: importId },
        data: { sourceType: rows[0].sourceType, parserVersion: 2 },
      });
      return { repaired: planned.length, alreadyCurrent: false };
    },
    { timeout: 120000 },
  );
}
