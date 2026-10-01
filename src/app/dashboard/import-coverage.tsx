import { monthCoverage, type SourceCoverage } from "@/lib/import-coverage";

function describe(coverage: SourceCoverage) {
  const days =
    coverage.firstDay === coverage.lastDay
      ? `dia ${coverage.firstDay}`
      : `dias ${coverage.firstDay}–${coverage.lastDay}`;
  return `${coverage.count} ${coverage.count === 1 ? "lançamento" : "lançamentos"}, ${days}`;
}

export function ImportCoverage({
  transactions,
}: {
  transactions: { occurredAt: Date; sourceType: string }[];
}) {
  const coverage = monthCoverage(transactions);
  const sources = [
    ["Cartão", coverage.CREDIT_CARD],
    ["Conta", coverage.BANK_STATEMENT],
  ] as const;
  return (
    <p className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
      {sources.map(([label, item]) => (
        <span key={label} className={item ? undefined : "text-warn"}>
          {label}: {item ? describe(item) : "nenhum lançamento importado"}
        </span>
      ))}
    </p>
  );
}
