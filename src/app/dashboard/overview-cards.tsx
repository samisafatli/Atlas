import { formatCents } from "@/lib/finance-format";

export function OverviewCards({
  income,
  expenses,
}: {
  income: bigint;
  expenses: bigint;
}) {
  const balance = income - expenses;
  const cards = [
    { label: "Receitas", amount: income, tone: "text-emerald-800" },
    { label: "Despesas líquidas", amount: expenses, tone: "text-rose-800" },
    {
      label: "Resultado do período",
      amount: balance,
      tone: balance >= 0n ? "text-emerald-800" : "text-rose-800",
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <article
          className="rounded-2xl border border-[var(--line)] bg-white/80 p-5"
          key={card.label}
        >
          <p className="text-sm text-[var(--muted)]">{card.label}</p>
          <p
            className={`mt-3 text-2xl font-semibold tracking-tight ${card.tone}`}
          >
            {formatCents(card.amount)}
          </p>
          {card.label === "Resultado do período" ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Receitas menos despesas líquidas do mês. Não é saldo bancário nem
              dinheiro disponível.
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
