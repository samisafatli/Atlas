import type { prisma } from "./prisma";

type InstallmentRow = {
  id: string;
  description: string;
  amountCents: bigint;
  occurredAt: Date;
  accountId: string;
  sourceType: string;
};

export function parseInstallment(description: string) {
  const match = description
    .normalize("NFKC")
    .match(/^(.*?)\s*-\s*parcela\s+(\d{1,3})\s*\/\s*(\d{1,3})\s*$/i);
  if (!match) return null;
  const index = Number(match[2]);
  const total = Number(match[3]);
  if (total < 2 || index < 1 || index > total) return null;
  return { base: match[1].trim(), index, total };
}

function shiftMonths(date: Date, months: number) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate(),
      12,
    ),
  );
}

// Card files repeat the purchase text with "Parcela n/N" in later months, and
// the first installment may differ by a cent. Anything ambiguous is left out:
// these are suggestions shown to the user, never applied silently.
export function matchInstallments<T extends InstallmentRow>(
  row: InstallmentRow,
  candidates: T[],
) {
  const own = parseInstallment(row.description);
  if (!own) return [];
  const base = own.base.toLocaleLowerCase("pt-BR");
  const byIndex = new Map<number, T[]>();
  for (const candidate of candidates) {
    const other = parseInstallment(candidate.description);
    if (
      !other ||
      candidate.id === row.id ||
      candidate.accountId !== row.accountId ||
      candidate.sourceType !== row.sourceType ||
      other.base.toLocaleLowerCase("pt-BR") !== base ||
      other.total !== own.total ||
      other.index === own.index
    )
      continue;
    const difference = candidate.amountCents - row.amountCents;
    if (difference > 1n || difference < -1n) continue;
    const expected = shiftMonths(row.occurredAt, other.index - own.index);
    const days =
      Math.abs(candidate.occurredAt.getTime() - expected.getTime()) / 86400000;
    if (days > 7) continue;
    byIndex.set(other.index, [...(byIndex.get(other.index) ?? []), candidate]);
  }
  return [...byIndex.entries()]
    .filter(([, rows]) => rows.length === 1)
    .sort(([left], [right]) => left - right)
    .map(([index, [candidate]]) => ({ ...candidate, index, total: own.total }));
}

export async function findInstallmentSiblings(
  client: Pick<typeof prisma, "transaction">,
  row: InstallmentRow,
) {
  const own = parseInstallment(row.description);
  if (!own) return [];
  const candidates = await client.transaction.findMany({
    where: {
      accountId: row.accountId,
      sourceType: row.sourceType,
      description: { startsWith: own.base },
      id: { not: row.id },
    },
    select: {
      id: true,
      description: true,
      amountCents: true,
      occurredAt: true,
      accountId: true,
      sourceType: true,
      note: true,
    },
  });
  return matchInstallments(row, candidates);
}
