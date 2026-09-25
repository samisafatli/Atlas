import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getMonthRange, shiftMonth } from "@/lib/finance-format";
import { OverviewCards } from "./overview-cards";
import { SpendingCalendar } from "./spending-calendar";
import { CategoryBreakdown } from "./category-breakdown";
import { RecentTransactions } from "./recent-transactions";
import { MonthlyClose } from "./monthly-close";

export const metadata = {
  title: "Dashboard — Atlas",
  description: "Resumo mensal das finanças pessoais.",
};

function monthName(month: string) {
  const range = getMonthRange(month);
  return range
    ? new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(range.start)
    : month;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string | string[];
    dia?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const requestedMonth = first(query.month);
  const requestedDay = first(query.dia);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const selectedMonth =
    requestedMonth && getMonthRange(requestedMonth)
      ? requestedMonth
      : currentMonth;
  const range = getMonthRange(selectedMonth)!;
  const previousCandidate = shiftMonth(selectedMonth, -1);
  const previousRange = getMonthRange(previousCandidate);
  const previousMonth = previousRange ? previousCandidate : selectedMonth;
  const nextCandidate = shiftMonth(selectedMonth, 1);
  const nextMonth = getMonthRange(nextCandidate)
    ? nextCandidate
    : selectedMonth;
  const [transactions, previousTransactions, cumulativeTotals] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { occurredAt: { gte: range.start, lt: range.end } },
        include: { category: true, account: true },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      }),
      previousRange
        ? prisma.transaction.findMany({
            where: {
              occurredAt: { gte: previousRange.start, lt: previousRange.end },
            },
            include: { category: true },
          })
        : Promise.resolve([]),
      prisma.transaction.groupBy({
        by: ["type"],
        where: { occurredAt: { lt: range.end } },
        _sum: { amountCents: true },
      }),
    ]);
  const cumulativeBalance = cumulativeTotals.reduce(
    (sum, group) =>
      sum +
      (group.type === "INCOME"
        ? (group._sum.amountCents ?? 0n)
        : group.type === "EXPENSE"
          ? -(group._sum.amountCents ?? 0n)
          : 0n),
    0n,
  );
  const incomes = transactions.filter((item) => item.type === "INCOME");
  const expenses = transactions.filter((item) => item.type === "EXPENSE");
  const incomeTotal = incomes.reduce((sum, item) => sum + item.amountCents, 0n);
  const expenseTotal = expenses.reduce(
    (sum, item) => sum + item.amountCents,
    0n,
  );
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <Link
          className="text-sm font-semibold tracking-[0.2em] text-[var(--accent)] uppercase"
          href="/"
        >
          Atlas
        </Link>
        <nav className="flex flex-wrap gap-4 text-sm">
          <Link
            className="text-[var(--muted)] hover:text-[var(--foreground)]"
            href="/transacoes"
          >
            Transações
          </Link>
          <Link
            className="text-[var(--muted)] hover:text-[var(--foreground)]"
            href="/regras"
          >
            Regras
          </Link>
          <Link
            className="text-[var(--muted)] hover:text-[var(--foreground)]"
            href="/recorrentes"
          >
            Recorrentes
          </Link>
          <Link
            className="text-[var(--muted)] hover:text-[var(--foreground)]"
            href="/patrimonio"
          >
            Patrimônio
          </Link>
          <Link
            className="text-[var(--muted)] hover:text-[var(--foreground)]"
            href="/backup"
          >
            Backup
          </Link>
        </nav>
      </header>
      <section>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm text-[var(--muted)]">Visão geral</p>
            <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              aria-label="Mês anterior"
              className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-white/70"
              href={`/dashboard?month=${previousMonth}`}
            >
              ←
            </Link>
            <p className="min-w-36 text-center font-medium capitalize">
              {monthName(selectedMonth)}
            </p>
            <Link
              aria-label="Próximo mês"
              className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-white/70"
              href={`/dashboard?month=${nextMonth}`}
            >
              →
            </Link>
          </div>
        </div>
        <OverviewCards
          income={incomeTotal}
          expenses={expenseTotal}
          cumulativeBalance={cumulativeBalance}
        />
        {!transactions.length ? (
          <p className="mt-4 rounded-xl border border-[var(--line)] bg-white/60 p-4 text-sm text-[var(--muted)]">
            Nenhuma transação registrada neste mês. Importe um CSV ou cadastre
            uma transação para começar.
          </p>
        ) : null}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <SpendingCalendar
            month={selectedMonth}
            transactions={transactions}
            selectedDay={requestedDay}
          />
          <CategoryBreakdown
            expenses={expenses}
            total={expenseTotal}
            month={selectedMonth}
          />
          <RecentTransactions
            transactions={transactions}
            month={selectedMonth}
          />
          <MonthlyClose
            month={selectedMonth}
            income={incomeTotal}
            expenses={expenseTotal}
            currentTransactions={transactions}
            previousTransactions={previousTransactions}
            previousMonth={previousMonth}
          />
        </div>
      </section>
    </main>
  );
}
