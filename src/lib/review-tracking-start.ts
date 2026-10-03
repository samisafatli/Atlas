import { prisma } from "./prisma-client";
import { createBackupObject, backupJson, saveProtectionBackup } from "./backup";
import { isDebitPurchaseRefund, categoryType } from "./transaction-types";
import { matchCategoryRule, sortCategoryRules } from "./category-rules";
import { TRACKING_START_DATE } from "./tracking-period";

export const suggestedTrackingRules = [
  ["UBER *TRIP", "Transporte"],
  ["SUPERMERCADOS MUNDIAL", "Mercado"],
  ["SUPERMERC MUNDIAL", "Mercado"],
  ["Netflix.Com", "Assinaturas"],
  ["Netflix Entretenimento", "Assinaturas"],
  ["Claude.Ai Subscription", "Assinaturas"],
  ["Obramax", "Moradia — Reformas e manutenção"],
  ["Sua Academia", "Saúde"],
  ["TELEFONICA BRAS", "Moradia"],
  ["VIVO-RJ TELEFONICA", "Moradia"],
  ["Metro Rj", "Transporte"],
] as const;

// Explicit one-time maintenance, never run automatically on app startup.
export async function reviewTrackingStart() {
  const protectionFile = await saveProtectionBackup(
    backupJson(await createBackupObject()),
  );
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.categoryRule.findMany();
      let addedRules = 0;
      for (const [contains, name] of suggestedTrackingRules) {
        // Preserve user's existing decisions, including disabled rules.
        if (
          existing.some(
            (rule) => rule.contains.toLowerCase() === contains.toLowerCase(),
          )
        )
          continue;
        const category = await tx.category.upsert({
          where: { name_type: { name, type: "EXPENSE" } },
          create: { name, type: "EXPENSE" },
          update: {},
        });
        await tx.categoryRule.create({
          data: { contains, categoryId: category.id },
        });
        addedRules++;
      }
      const rules = sortCategoryRules(
        await tx.categoryRule.findMany({
          where: { enabled: true },
          include: { category: true },
        }),
      );
      const rows = await tx.transaction.findMany({
        where: {
          occurredAt: { gte: TRACKING_START_DATE },
          sourceType: { in: ["BANK_STATEMENT", "CREDIT_CARD"] },
        },
        include: { category: true },
      });
      let refunds = 0,
        categorized = 0,
        refundsNeedingReview = 0;
      for (const row of rows) {
        const refund =
          row.sourceType === "BANK_STATEMENT" &&
          row.type === "INCOME" &&
          isDebitPurchaseRefund(row.description);
        if (refund && row.category && row.category.type !== "EXPENSE") {
          refundsNeedingReview++;
          continue;
        }
        const type = refund ? "REFUND" : row.type;
        // Existing categories are never replaced, even on corrected refunds.
        const match =
          row.categoryId === null
            ? matchCategoryRule(
                row.description,
                categoryType(type) ?? "",
                rules,
              )
            : null;
        if (!refund && !match) continue;
        const result = await tx.transaction.updateMany({
          where: { id: row.id, updatedAt: row.updatedAt },
          data: { type, categoryId: match?.category.id ?? row.categoryId },
        });
        if (result.count !== 1)
          throw new Error(
            "Lançamento alterado durante revisão; operação cancelada.",
          );
        if (refund) refunds++;
        if (match) categorized++;
      }
      return {
        addedRules,
        refunds,
        categorized,
        refundsNeedingReview,
        protectionFile,
      };
    },
    { timeout: 120000 },
  );
}
