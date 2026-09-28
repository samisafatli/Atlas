import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getMonthRange, shiftMonth } from "@/lib/finance-format";
import { OverviewCards } from "./overview-cards";
import { SpendingCalendar } from "./spending-calendar";
import { CategoryBreakdown } from "./category-breakdown";
import { RecentTransactions } from "./recent-transactions";
import { MonthlyClose } from "./monthly-close";
import { expenseAmount } from "@/lib/transaction-types";
import { PageShell } from "@/app/page-shell";

export const metadata = {
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
  const [transactions, previousTransactions] = await Promise.all([
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
  ]);
  const incomes = transactions.filter((item) => item.type === "INCOME");
  const expenses = transactions
    .filter((item) => ["EXPENSE", "REFUND"].includes(item.type))
    .map((item) => ({
      ...item,
      amountCents: expenseAmount(item.type, item.amountCents),
    }));
  const incomeTotal = incomes.reduce((sum, item) => sum + item.amountCents, 0n);
  const expenseTotal = expenses.reduce(
    (sum, item) => sum + item.amountCents,
    0n,
  );
  return (
    <PageShell>
      <section>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm text-[var(--muted)]">
              Finanças pessoais · Nubank
            </p>
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
        <OverviewCards income={incomeTotal} expenses={expenseTotal} />
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
            income={incomeTotal}
            expenses={expenseTotal}
            currentTransactions={transactions}
            previousTransactions={previousTransactions}
            previousMonth={previousMonth}
          />
        </div>
      </section>
    </PageShell>
  );
}
