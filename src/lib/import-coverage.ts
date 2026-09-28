import type { ImportSource } from "./nubank-csv";

export type SourceCoverage = {
  count: number;
  firstDay: number;
  lastDay: number;
};

// Describes which imported files have rows in the month. Dates show what was
// imported, not that the month is complete: card rows use purchase dates.
export function monthCoverage(
  rows: { occurredAt: Date; sourceType: string }[],
) {
  const coverage: Record<ImportSource, SourceCoverage | null> = {
    CREDIT_CARD: null,
    BANK_STATEMENT: null,
  };
  for (const row of rows) {
    if (row.sourceType !== "CREDIT_CARD" && row.sourceType !== "BANK_STATEMENT")
      continue;
    const day = row.occurredAt.getUTCDate();
    const current = coverage[row.sourceType];
    coverage[row.sourceType] = current
      ? {
          count: current.count + 1,
          firstDay: Math.min(current.firstDay, day),
          lastDay: Math.max(current.lastDay, day),
        }
      : { count: 1, firstDay: day, lastDay: day };
  }
  return coverage;
}
