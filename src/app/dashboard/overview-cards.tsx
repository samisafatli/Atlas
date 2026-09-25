import { formatCents } from "@/lib/finance-format";

export function OverviewCards({
  income,
  expenses,
  cumulativeBalance,
}: {
  income: bigint;
  expenses: bigint;
  cumulativeBalance: bigint;
}) {
  const balance = income - expenses;
  const cards = [
    { label: "Receitas", amount: income, tone: "text-emerald-800" },
    { label: "Despesas", amount: expenses, tone: "text-rose-800" },
    {
      label: "Resultado do período",
      amount: balance,
      tone: balance >= 0n ? "text-emerald-800" : "text-rose-800",
    },
    {
      label: "Saldo calculado",
      amount: cumulativeBalance,
      tone: cumulativeBalance >= 0n ? "text-emerald-800" : "text-rose-800",
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          {card.label === "Saldo calculado" ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Receitas menos despesas registradas até o fim do mês selecionado.
              Não inclui saldo inicial nem patrimônio.
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
