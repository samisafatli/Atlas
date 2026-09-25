import Link from "next/link";
import { formatCents } from "@/lib/finance-format";

type Entry = {
  type: string;
  amountCents: bigint;
  category: { name: string } | null;
};

export function MonthlyClose({
  month,
  income,
  expenses,
  currentTransactions,
  previousTransactions,
  previousMonth,
}: {
  month: string;
  income: bigint;
  expenses: bigint;
  currentTransactions: Entry[];
  previousTransactions: Entry[];
  previousMonth: string;
}) {
  const savings = income - expenses;
  const savingsRate =
    income > 0n ? Number((savings * 10000n) / income) / 100 : null;
  const totals = (entries: Entry[]) => {
    const result = new Map<string, bigint>();
    for (const entry of entries)
      if (entry.type === "EXPENSE") {
        const name = entry.category?.name ?? "Sem categoria";
        result.set(name, (result.get(name) ?? 0n) + entry.amountCents);
      }
    return result;
  };
  const currentByCategory = totals(currentTransactions);
  const previousByCategory = totals(previousTransactions);
  const categories = [...currentByCategory.entries()]
    .sort((a, b) =>
      a[1] === b[1] ? a[0].localeCompare(b[0]) : a[1] > b[1] ? -1 : 1,
    )
    .slice(0, 3);
  return (
    <section
      className="rounded-2xl border border-[var(--line)] bg-white/80 p-5"
      aria-labelledby="closing-title"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-medium" id="closing-title">
          Fechamento mensal
        </h2>
        <Link
          className="text-sm text-[var(--accent)] hover:underline"
          href={`/dashboard?month=${previousMonth}`}
        >
          Comparar com mês anterior
        </Link>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <p className="rounded-lg bg-[#f7f8f5] p-3">
          Receitas<strong className="mt-1 block">{formatCents(income)}</strong>
        </p>
        <p className="rounded-lg bg-[#f7f8f5] p-3">
          Despesas
          <strong className="mt-1 block">{formatCents(expenses)}</strong>
        </p>
        <p className="rounded-lg bg-[#f7f8f5] p-3">
          Economizado
          <strong className="mt-1 block">{formatCents(savings)}</strong>
        </p>
      </div>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Taxa de poupança:{" "}
        {savingsRate === null
          ? "— (sem receitas)"
          : `${savingsRate.toFixed(2).replace(".", ",")}%`}
      </p>
      <div className="mt-4 border-t border-[var(--line)] pt-4">
        <h3 className="text-sm font-medium">
          Principais categorias vs. mês anterior
        </h3>
        {categories.length ? (
          <ul className="mt-2 grid gap-2">
            {categories.map(([category, amount]) => {
              const previous = previousByCategory.get(category) ?? 0n;
              const delta = amount - previous;
              return (
                <li
                  className="flex flex-wrap justify-between gap-2 text-sm"
                  key={category}
                >
                  <span>{category}</span>
                  <span>
                    {formatCents(amount)}{" "}
                    <span className="text-xs text-[var(--muted)]">
                      (anterior: {formatCents(previous)};{" "}
                      {delta > 0n ? "+" : ""}
                      {formatCents(delta)})
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Sem despesas por categoria no período.
          </p>
        )}
      </div>
      <p className="mt-4 text-xs text-[var(--muted)]">
        Valores calculados a partir das transações de {month} e {previousMonth}.
        Meses sem dados são tratados como zero.
      </p>
    </section>
  );
}
