import { prisma } from "./prisma-client";
import { backupJson, createBackupObject, saveProtectionBackup } from "./backup";
import {
  motherTransactionType,
  salaryCategory,
  utilitySupplier,
} from "./personal-rules";
import { transactionFingerprint } from "./transaction-fingerprint";
import type { TransactionType } from "./transaction-types";

export async function repairPersonalHistory() {
  const rows = await prisma.transaction.findMany({
    where: { sourceType: "BANK_STATEMENT" },
    include: { category: true },
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
  });
  type Change = {
    row: (typeof rows)[number];
    type: TransactionType;
    category: string | null;
    ownershipEstimated?: boolean;
  };
  const changes = new Map<string, Change>();
  const utilities = new Map<string, typeof rows>();
  for (const row of rows) {
    if (["INCOME", "EXPENSE"].includes(row.type)) {
      const mother = motherTransactionType(
        row.description,
        row.type === "EXPENSE",
      );
      const salary = salaryCategory(row.description, row.type, row.sourceType);
      if (mother) changes.set(row.id, { row, type: mother, category: null });
      else if (salary && row.category?.name !== salary)
        changes.set(row.id, { row, type: "INCOME", category: salary });
    }
    const supplier = utilitySupplier(row.description);
    if (
      supplier &&
      ["EXPENSE", "MOTHER_EXPENSE", "MOTHER_ESTIMATED_EXPENSE"].includes(
        row.type,
      ) &&
      row.occurredAt < new Date("2026-09-29T00:00:00Z")
    ) {
      const key = `${row.accountId}:${row.occurredAt.toISOString().slice(0, 7)}:${supplier}`;
      utilities.set(key, [...(utilities.get(key) ?? []), row]);
    }
  }
  let estimatedPairs = 0;
  for (const group of utilities.values()) {
    // Never repeat a split or override a previous manual ownership decision.
    if (
      group.length !== 2 ||
      group.some((row) => row.type !== "EXPENSE" || row.category !== null)
    )
      continue;
    changes.set(group[0].id, {
      row: group[0],
      type: "EXPENSE",
      category: "Moradia",
      ownershipEstimated: true,
    });
    changes.set(group[1].id, {
      row: group[1],
      type: "MOTHER_ESTIMATED_EXPENSE",
      category: null,
    });
    estimatedPairs++;
  }
  if (!changes.size)
    return { changed: 0, estimatedPairs: 0, protectionFile: null };
  const protectionFile = await saveProtectionBackup(
    backupJson(await createBackupObject()),
  );
  await prisma.$transaction(
    async (tx) => {
      for (const {
        row,
        type,
        category,
        ownershipEstimated,
      } of changes.values()) {
        const categoryId = category
          ? (
              await tx.category.upsert({
                where: {
                  name_type: {
                    name: category,
                    type: type === "INCOME" ? "INCOME" : "EXPENSE",
                  },
                },
                create: {
                  name: category,
                  type: type === "INCOME" ? "INCOME" : "EXPENSE",
                },
                update: {},
              })
            ).id
          : null;
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
          where: { id: row.id, updatedAt: row.updatedAt },
          data: { type, categoryId, fingerprint, ownershipEstimated },
        });
        if (result.count !== 1)
          throw new Error(
            "Lançamento alterado durante a revisão; operação cancelada.",
          );
      }
    },
    { timeout: 120000 },
  );
  return { changed: changes.size, estimatedPairs, protectionFile };
}
