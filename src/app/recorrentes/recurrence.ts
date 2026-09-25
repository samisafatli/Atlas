type CandidateTransaction = {
  id: string;
  description: string;
  amountCents: bigint;
  occurredAt: Date;
  accountId: string;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
};

function normalizeMerchant(description: string) {
  return description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function detectRecurringExpenses(transactions: CandidateTransaction[]) {
  const groups = new Map<string, CandidateTransaction[]>();
  for (const transaction of transactions) {
    const merchant = normalizeMerchant(transaction.description);
    if (!merchant) continue;
    const key = [
      merchant,
      transaction.accountId,
      transaction.categoryId ?? "",
    ].join("|");
    groups.set(key, [...(groups.get(key) ?? []), transaction]);
  }
  return [...groups.values()]
    .flatMap((items) => {
      const ordered = [...items].sort(
        (left, right) => left.occurredAt.getTime() - right.occurredAt.getTime(),
      );
      if (ordered.length < 3) return [];
      const intervals = ordered
        .slice(1)
        .map((item, index) =>
          Math.round(
            (item.occurredAt.getTime() - ordered[index].occurredAt.getTime()) /
              86400000,
          ),
        );
      const monthlyIntervals = intervals.filter(
        (interval) => interval >= 24 && interval <= 40,
      );
      const compatible = ordered.filter((item) => {
        const average =
          ordered.reduce((sum, current) => sum + current.amountCents, 0n) /
          BigInt(ordered.length);
        return (
          average === 0n ||
          (item.amountCents > average
            ? item.amountCents - average
            : average - item.amountCents) *
            100n <=
            average * 15n
        );
      });
      if (monthlyIntervals.length < 2 || compatible.length < 3) return [];
      const amountTotal = compatible.reduce(
        (sum, item) => sum + item.amountCents,
        0n,
      );
      const monthlyEstimate = amountTotal / BigInt(compatible.length);
      return [
        {
          description: compatible[0].description,
          accountName: compatible[0].accountName,
          categoryName: compatible[0].categoryName ?? "Sem categoria",
          count: compatible.length,
          monthlyEstimate,
          transactions: compatible,
        },
      ];
    })
    .sort((left, right) =>
      left.monthlyEstimate === right.monthlyEstimate
        ? left.description.localeCompare(right.description)
        : left.monthlyEstimate > right.monthlyEstimate
          ? -1
          : 1,
    );
}
