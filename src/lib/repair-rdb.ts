import { prisma } from "./prisma";
import { backupJson, createBackupObject, saveProtectionBackup } from "./backup";
import { rdbTransactionType } from "./transaction-types";
import { transactionFingerprint } from "./transaction-fingerprint";

export async function repairRdb() {
  const rows = await prisma.transaction.findMany({
    where: {
      sourceType: "BANK_STATEMENT",
      type: { in: ["INCOME", "EXPENSE"] },
    },
  });
  const changes = rows.flatMap((row) => {
    const type = rdbTransactionType(row.description, row.type === "EXPENSE");
    return type ? [{ row, type }] : [];
  });
  if (!changes.length) return { changed: 0, protectionFile: null };
  const protectionFile = await saveProtectionBackup(
    backupJson(await createBackupObject()),
  );
  await prisma.$transaction(
    async (tx) => {
      for (const { row, type } of changes) {
        const fingerprint = row.fingerprint
          ? transactionFingerprint({
              date: row.occurredAt.toISOString().slice(0, 10),
              description: row.description,
              amountCents: row.amountCents.toString(),
              accountId: row.accountId,
              sourceType: row.sourceType,
              externalId: row.externalId,
              type,
              occurrence: Number(
                row.fingerprint.match(/:occ:(\d+)$/)?.[1] ?? 1,
              ),
            })
          : null;
        const result = await tx.transaction.updateMany({
          where: { id: row.id, updatedAt: row.updatedAt, type: row.type },
          data: { type, categoryId: null, fingerprint },
        });
        if (result.count !== 1)
          throw new Error(
            "Lançamento alterado durante o reparo; operação cancelada.",
          );
      }
    },
    { timeout: 120000 },
  );
  return { changed: changes.length, protectionFile };
}
