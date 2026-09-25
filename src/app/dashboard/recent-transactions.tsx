import Link from "next/link";
import { formatCents } from "@/lib/finance-format";

type RecentTransaction = {
  id: string;
  description: string;
  amountCents: bigint;
  type: string;
  occurredAt: Date;
  category: { name: string } | null;
  account: { currency: string };
};

export function RecentTransactions({
  transactions,
  month,
}: {
  transactions: RecentTransaction[];
  month: string;
}) {
  const recent = transactions.slice(0, 5);
  return (
    <section
      className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white/80"
      aria-labelledby="recent-title"
    >
      <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
        <h2 className="font-medium" id="recent-title">
          Últimas transações
        </h2>
        <Link
          className="text-sm text-[var(--accent)] hover:underline"
          href={`/transacoes?month=${month}`}
        >
          Ver todas
        </Link>
      </div>
      {recent.length ? (
        <ul className="divide-y divide-[var(--line)]">
          {recent.map((transaction) => (
            <li
              className="flex items-center justify-between gap-4 px-5 py-4"
              key={transaction.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {transaction.description}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "medium",
                    timeZone: "UTC",
                  }).format(transaction.occurredAt)}{" "}
                  · {transaction.category?.name ?? "Sem categoria"}
                </p>
              </div>
              <span
                className={`whitespace-nowrap text-sm font-semibold ${transaction.type === "INCOME" ? "text-emerald-800" : "text-rose-800"}`}
              >
                {transaction.type === "INCOME" ? "+ " : "− "}
                {formatCents(
                  transaction.amountCents,
                  transaction.account.currency,
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-5 text-sm text-[var(--muted)]">
          Nenhuma transação no período.
        </p>
      )}
    </section>
  );
}
