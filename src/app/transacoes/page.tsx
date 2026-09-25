import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Transações — Atlas",
  description: "Consulte as transações registradas no Atlas.",
};

type SearchParams = Promise<{
  month?: string | string[];
  type?: string | string[];
  category?: string | string[];
}>;

type TransactionsPageProps = {
  searchParams: SearchParams;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getMonthRange(value: string | undefined) {
  const match = value?.match(/^(\d{4})-(0[1-9]|1[0-2])$/);

  if (!match) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (year < 1900 || year > 9999) {
    return undefined;
  }

  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  };
}

function formatCurrencyFromCents(amountCents: bigint, currency: string) {
  const isNegative = amountCents < 0n;
  const absoluteCents = isNegative ? -amountCents : amountCents;
  const wholeUnits = absoluteCents / 100n;
  const cents = (absoluteCents % 100n).toString().padStart(2, "0");
  const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const parts = currencyFormatter.formatToParts(wholeUnits);
  const lastNumberPart = parts.reduce(
    (lastIndex, part, index) =>
      part.type === "integer" || part.type === "group" ? index : lastIndex,
    -1,
  );
  const decimalSeparator = new Intl.NumberFormat("pt-BR")
    .formatToParts(1.1)
    .find((part) => part.type === "decimal")?.value;

  if (lastNumberPart >= 0) {
    parts.splice(
      lastNumberPart + 1,
      0,
      { type: "decimal", value: decimalSeparator ?? "," },
      { type: "fraction", value: cents },
    );
  }

  return (isNegative ? "−" : "") + parts.map((part) => part.value).join("");
}

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const params = await searchParams;
  const requestedMonth = firstValue(params.month) ?? "";
  const monthRange = getMonthRange(requestedMonth);
  const month = monthRange ? requestedMonth : "";
  const requestedType = firstValue(params.type);
  const requestedCategory = firstValue(params.category);
  const type =
    requestedType === "INCOME" || requestedType === "EXPENSE"
      ? requestedType
      : "";
  const categories = await prisma.category.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  const categoryId = categories.some(
    (category) => category.id === requestedCategory,
  )
    ? requestedCategory
    : "";

  const transactions = await prisma.transaction.findMany({
    where: {
      ...(monthRange ? { occurredAt: monthRange } : {}),
      ...(type ? { type } : {}),
      ...(categoryId ? { categoryId } : {}),
    },
    include: { account: true, category: true },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });

  const hasFilters = Boolean(month || type || categoryId);

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link
            className="text-sm font-semibold tracking-[0.2em] text-[var(--accent)] uppercase"
            href="/"
          >
            Atlas
          </Link>
          <Link
            className="text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
            href="/"
          >
            Voltar ao início
          </Link>
        </header>

        <section aria-labelledby="transactions-title">
          <div className="mb-8">
            <p className="mb-3 text-sm text-[var(--muted)]">
              Seu histórico financeiro
            </p>
            <h1
              className="text-3xl font-medium tracking-tight sm:text-4xl"
              id="transactions-title"
            >
              Transações
            </h1>
          </div>

          <form
            action="/transacoes"
            className="mb-8 grid gap-4 rounded-2xl border border-[var(--line)] bg-white/70 p-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr_auto_auto] lg:items-end"
            method="get"
          >
            <label className="grid gap-2 text-sm font-medium" htmlFor="month">
              Mês
              <input
                className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 font-normal outline-none focus:border-[var(--accent)]"
                id="month"
                name="month"
                type="month"
                defaultValue={month}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium" htmlFor="type">
              Tipo
              <select
                className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 font-normal outline-none focus:border-[var(--accent)]"
                id="type"
                name="type"
                defaultValue={type}
              >
                <option value="">Todos</option>
                <option value="INCOME">Receitas</option>
                <option value="EXPENSE">Despesas</option>
              </select>
            </label>

            <label
              className="grid gap-2 text-sm font-medium"
              htmlFor="category"
            >
              Categoria
              <select
                className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 font-normal outline-none focus:border-[var(--accent)]"
                id="category"
                name="category"
                defaultValue={categoryId}
              >
                <option value="">Todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="min-h-11 rounded-lg bg-[var(--foreground)] px-5 text-sm font-medium text-white transition hover:bg-[var(--accent)]"
              type="submit"
            >
              Filtrar
            </button>
            <Link
              className="inline-flex min-h-11 items-center justify-center px-2 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
              href="/transacoes"
            >
              Limpar
            </Link>
          </form>

          <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white/80">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-6">
              <h2 className="font-medium">Todas as transações</h2>
              <span className="text-sm text-[var(--muted)]">
                {transactions.length}{" "}
                {transactions.length === 1 ? "registro" : "registros"}
              </span>
            </div>

            {transactions.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div
                  aria-hidden="true"
                  className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-[#e9f0eb] text-xl text-[var(--accent)]"
                >
                  {hasFilters ? "⌕" : "—"}
                </div>
                <h3 className="font-medium">
                  {hasFilters
                    ? "Nenhuma transação encontrada"
                    : "Ainda não há transações"}
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
                  {hasFilters
                    ? "Tente mudar ou limpar os filtros para ver outros resultados."
                    : "Quando houver transações registradas, elas aparecerão aqui."}
                </p>
                {hasFilters ? (
                  <Link
                    className="mt-5 inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
                    href="/transacoes"
                  >
                    Limpar filtros
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="bg-[#f7f8f5] text-xs tracking-wide text-[var(--muted)] uppercase">
                    <tr>
                      <th className="px-6 py-3 font-medium" scope="col">
                        Data
                      </th>
                      <th className="px-6 py-3 font-medium" scope="col">
                        Descrição
                      </th>
                      <th className="px-6 py-3 font-medium" scope="col">
                        Categoria
                      </th>
                      <th className="px-6 py-3 font-medium" scope="col">
                        Conta
                      </th>
                      <th
                        className="px-6 py-3 text-right font-medium"
                        scope="col"
                      >
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {transactions.map((transaction) => {
                      const isIncome = transaction.type === "INCOME";
                      const isExpense = transaction.type === "EXPENSE";
                      const tone = isIncome
                        ? "text-emerald-700"
                        : isExpense
                          ? "text-rose-700"
                          : "text-[var(--foreground)]";
                      const typeLabel = isIncome
                        ? "Receita"
                        : isExpense
                          ? "Despesa"
                          : transaction.type;
                      const amountSign = isIncome ? "+" : isExpense ? "−" : "";

                      return (
                        <tr key={transaction.id}>
                          <td className="whitespace-nowrap px-6 py-4 text-[var(--muted)]">
                            <time
                              dateTime={transaction.occurredAt.toISOString()}
                            >
                              {new Intl.DateTimeFormat("pt-BR", {
                                dateStyle: "medium",
                                timeZone: "UTC",
                              }).format(transaction.occurredAt)}
                            </time>
                          </td>
                          <td className="px-6 py-4 font-medium">
                            <span>{transaction.description}</span>
                            <span
                              className={
                                "mt-1 block text-xs font-normal " + tone
                              }
                            >
                              {typeLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[var(--muted)]">
                            {transaction.category?.name ?? "Sem categoria"}
                          </td>
                          <td className="px-6 py-4 text-[var(--muted)]">
                            {transaction.account.name}
                          </td>
                          <td
                            className={
                              "whitespace-nowrap px-6 py-4 text-right font-semibold " +
                              tone
                            }
                          >
                            {amountSign}{" "}
                            {formatCurrencyFromCents(
                              transaction.amountCents,
                              transaction.account.currency,
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
