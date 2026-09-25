"use server";

import { prisma } from "@/lib/prisma";
import { transactionFingerprint } from "@/lib/transaction-fingerprint";
import { existingImportFingerprints } from "@/lib/import-deduplication";
import { matchCategoryRule, sortCategoryRules } from "@/lib/category-rules";

type Candidate = {
  date: string;
  description: string;
  amountCents: string;
  type: "INCOME" | "EXPENSE";
};

export async function countImportDuplicates(
  transactions: Candidate[],
  accountId: string,
) {
  if (!accountId || transactions.length > 50000)
    return {
      existing: 0,
      newCount: transactions.length,
      suggestions: [] as { description: string; category: string }[],
    };
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true },
  });
  if (!account)
    return {
      existing: 0,
      newCount: transactions.length,
      suggestions: [] as { description: string; category: string }[],
    };
  const fingerprints = transactions.map((transaction) =>
    transactionFingerprint({ ...transaction, accountId }),
  );
  const existingSet = await existingImportFingerprints(
    prisma,
    transactions.map((transaction) => ({ ...transaction, accountId })),
  );
  const seen = new Set<string>();
  let existing = 0;
  for (const fingerprint of fingerprints) {
    if (existingSet.has(fingerprint) || seen.has(fingerprint)) existing += 1;
    seen.add(fingerprint);
  }
  const rules = sortCategoryRules(
    await prisma.categoryRule.findMany({
      where: { enabled: true },
      include: { category: true },
    }),
  );
  const suggestions = transactions
    .flatMap((transaction) => {
      const match = matchCategoryRule(
        transaction.description,
        transaction.type,
        rules,
      );
      return match
        ? [
            {
              description: transaction.description,
              category: match.category.name,
            },
          ]
        : [];
    })
    .slice(0, 100);
  return { existing, newCount: transactions.length - existing, suggestions };
}
