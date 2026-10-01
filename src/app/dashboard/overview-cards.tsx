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
    { label: "Receitas", amount: income, tone: "text-pos", hero: false },
    {
      label: "Despesas líquidas",
      amount: expenses,
      tone: "text-neg",
      hero: false,
    },
    {
      label: "Resultado do período",
      amount: balance,
      tone: balance >= 0n ? "text-pos" : "text-neg",
      hero: true,
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <article
          className={`rounded-2xl border p-5 ${card.hero ? "border-[var(--hero-line)] bg-hero" : "border-[var(--line)] bg-surface"}`}
          key={card.label}
        >
          <p className="text-sm text-[var(--muted)]">{card.label}</p>
          <p
            className={`mt-3 font-semibold tracking-tight ${card.hero ? "text-3xl" : "text-2xl"} ${card.tone}`}
          >
            {formatCents(card.amount)}
          </p>
        </article>
      ))}
    </div>
  );
}
