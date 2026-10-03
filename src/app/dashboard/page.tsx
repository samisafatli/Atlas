import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { getMonthRange, shiftMonth } from "@/lib/finance-format";
import { OverviewCards } from "./overview-cards";
import { SpendingCalendar } from "./spending-calendar";
import { CategoryBreakdown } from "./category-breakdown";
import { ImportCoverage } from "./import-coverage";
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
  const prisma = await getPrisma();
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
  const transactions = await prisma.transaction.findMany({
    where: { occurredAt: { gte: range.start, lt: range.end } },
    include: { category: true, account: true },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });
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
            <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              aria-label="Mês anterior"
              className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-surface-2"
              href={`/dashboard?month=${previousMonth}`}
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </Link>
            <p className="min-w-36 text-center font-medium first-letter:uppercase">
              {monthName(selectedMonth)}
            </p>
            <Link
              aria-label="Próximo mês"
              className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-surface-2"
              href={`/dashboard?month=${nextMonth}`}
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </Link>
          </div>
        </div>
        {transactions.length ? (
          <ImportCoverage transactions={transactions} />
        ) : null}
        <OverviewCards income={incomeTotal} expenses={expenseTotal} />
        {!transactions.length ? (
          <p className="mt-4 rounded-xl border border-[var(--line)] bg-surface-2 p-4 text-sm text-[var(--muted)]">
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
        </div>
      </section>
    </PageShell>
  );
}
