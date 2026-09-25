import Link from "next/link";
import { formatCents } from "@/lib/finance-format";

type Expense = {
  amountCents: bigint;
  category: { id: string; name: string } | null;
};

export function CategoryBreakdown({
  expenses,
  total,
  month,
}: {
  expenses: Expense[];
  total: bigint;
  month: string;
}) {
  const grouped = new Map<
    string,
    { name: string; id: string; amount: bigint }
  >();
  for (const expense of expenses) {
    const key = expense.category?.id ?? "uncategorized";
    const current = grouped.get(key) ?? {
      name: expense.category?.name ?? "Sem categoria",
      id: expense.category?.id ?? "",
      amount: 0n,
    };
    current.amount += expense.amountCents;
    grouped.set(key, current);
  }
  const items = [...grouped.values()].sort((left, right) =>
    left.amount === right.amount
      ? left.name.localeCompare(right.name)
      : left.amount > right.amount
        ? -1
        : 1,
  );
  return (
    <section
      className="rounded-2xl border border-[var(--line)] bg-white/80 p-5"
      aria-labelledby="category-title"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium" id="category-title">
          Despesas por categoria
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Total: {formatCents(total)}
        </p>
      </div>
      {items.length ? (
        <ul className="grid gap-4">
          {items.map((item) => {
            const percentage =
              total > 0n ? Number((item.amount * 10000n) / total) / 100 : 0;
            return (
              <li key={`${item.id}-${item.name}`}>
                <div className="mb-1 flex justify-between gap-4 text-sm">
                  <span>
                    {item.id ? (
                      <Link
                        className="hover:underline"
                        href={`/transacoes?month=${month}&category=${item.id}`}
                      >
                        {item.name}
                      </Link>
                    ) : (
                      item.name
                    )}
                  </span>
                  <span className="whitespace-nowrap text-[var(--muted)]">
                    {formatCents(item.amount)} ·{" "}
                    {percentage.toFixed(2).replace(".", ",")}%
                  </span>
                </div>
                <div
                  aria-label={`${item.name}: ${percentage.toFixed(2)} por cento`}
                  className="h-2 overflow-hidden rounded-full bg-[#e9eee9]"
                  role="img"
                >
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg bg-[#f7f8f5] p-4 text-sm text-[var(--muted)]">
          Sem despesas neste mês.
        </p>
      )}
    </section>
  );
}
