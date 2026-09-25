import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/finance-format";
import { detectRecurringExpenses } from "./recurrence";

export const metadata = { title: "Gastos recorrentes — Atlas" };

export default async function RecurringPage() {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
  );
  const expenses = await prisma.transaction.findMany({
    where: { type: "EXPENSE", occurredAt: { gte: start, lte: now } },
    include: { account: true, category: true },
    orderBy: { occurredAt: "asc" },
  });
  const recurring = detectRecurringExpenses(
    expenses.map((item) => ({
      id: item.id,
      description: item.description,
      amountCents: item.amountCents,
      occurredAt: item.occurredAt,
      accountId: item.accountId,
      accountName: item.account.name,
      categoryId: item.categoryId,
      categoryName: item.category?.name ?? null,
    })),
  );
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-10 flex justify-between">
        <Link
          className="text-sm font-semibold tracking-[0.2em] text-[var(--accent)] uppercase"
          href="/"
        >
          Atlas
        </Link>
        <Link className="text-sm text-[var(--muted)]" href="/dashboard">
          ← Dashboard
        </Link>
      </header>
      <h1 className="text-3xl font-medium">Gastos recorrentes</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
        Estimativas explicáveis com base em pelo menos três despesas parecidas,
        intervalos mensais e valores próximos nos últimos 12 meses. Nenhuma
        transação é alterada.
      </p>
      {recurring.length ? (
        <div className="mt-7 grid gap-4">
          {recurring.map((item) => (
            <article
              className="rounded-2xl border border-[var(--line)] bg-white/80 p-5"
              key={`${item.description}-${item.accountName}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-medium">{item.description}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {item.categoryName} · {item.accountName} · {item.count}{" "}
                    ocorrências compatíveis
                  </p>
                </div>
                <p className="text-sm">
                  Estimativa mensal
                  <strong className="mt-1 block text-xl">
                    {formatCents(item.monthlyEstimate)}
                  </strong>
                </p>
              </div>
              <details className="mt-4 border-t border-[var(--line)] pt-3">
                <summary className="cursor-pointer text-sm text-[var(--accent)]">
                  Ver transações usadas na detecção
                </summary>
                <ul className="mt-3 grid gap-2 text-sm">
                  {item.transactions.map((transaction) => (
                    <li
                      className="flex justify-between gap-3"
                      key={transaction.id}
                    >
                      <Link
                        className="hover:underline"
                        href={`/transacoes?dia=${transaction.occurredAt.toISOString().slice(0, 10)}&month=${transaction.occurredAt.toISOString().slice(0, 7)}`}
                      >
                        {new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "medium",
                          timeZone: "UTC",
                        }).format(transaction.occurredAt)}{" "}
                        · {transaction.description}
                      </Link>
                      <span className="whitespace-nowrap">
                        {formatCents(transaction.amountCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-7 rounded-2xl border border-[var(--line)] bg-white/70 p-8 text-sm text-[var(--muted)]">
          Ainda não há despesas mensais compatíveis. Quando houver pelo menos
          três ocorrências, elas aparecerão aqui.
        </p>
      )}
    </main>
  );
}
