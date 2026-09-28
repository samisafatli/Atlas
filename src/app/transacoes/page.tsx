import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getMonthRange } from "@/lib/finance-format";
import {
  categoryType,
  isTransactionType,
  transactionTypes,
} from "@/lib/transaction-types";
import { PageShell } from "@/app/page-shell";
import { TransactionFilters } from "./transaction-filters";
import { TransactionTable } from "./transaction-table";
import { Pagination } from "./pagination";

export const metadata = {
  description: "Consulte as transações registradas no Atlas.",
};

type SearchParams = Promise<{
  page?: string | string[];
  year?: string | string[];
  month?: string | string[];
  type?: string | string[];
  category?: string | string[];
  erro?: string;
  sucesso?: string;
  quantidade?: string;
  duplicadas?: string;
  categoriaStatus?: string;
  dia?: string;
  importId?: string;
}>;

type TransactionsPageProps = {
  searchParams: SearchParams;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function monthFilterRange(value: string) {
  const range = getMonthRange(value);
  return range ? { gte: range.start, lt: range.end } : undefined;
}

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const params = await searchParams;
  const requestedMonth = firstValue(params.month) ?? "";
  const requestedDay = firstValue(params.dia) ?? "";
  const noticeError = Boolean(firstValue(params.erro));
  const successMessage = firstValue(params.sucesso);
  const importedCount = Number(firstValue(params.quantidade) ?? 0);
  const duplicateCount = Number(firstValue(params.duplicadas) ?? 0);
  const requestedYear = firstValue(params.year);
  const validYear =
    requestedYear && /^(19\d{2}|[2-9]\d{3})$/.test(requestedYear)
      ? requestedYear
      : "";
  const legacyMonthRange = monthFilterRange(requestedMonth);
  const year =
    requestedYear === undefined
      ? legacyMonthRange
        ? requestedMonth.slice(0, 4)
        : ""
      : validYear;
  const month =
    year && legacyMonthRange && requestedMonth.startsWith(`${year}-`)
      ? requestedMonth
      : "";
  const monthRange = monthFilterRange(month);
  const yearRange = year
    ? {
        gte: new Date(`${year}-01-01T00:00:00Z`),
        lt: new Date(Date.UTC(Number(year) + 1, 0, 1)),
      }
    : undefined;
  const transactionDates = await prisma.transaction.findMany({
    select: { occurredAt: true },
    distinct: ["occurredAt"],
  });
  const years = [
    ...new Set(
      transactionDates.map(({ occurredAt }) => occurredAt.getUTCFullYear()),
    ),
  ].sort((a, b) => b - a);
  const dayMatch = requestedDay.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const requestedDate = new Date(`${requestedDay}T00:00:00.000Z`);
  const dayRange =
    dayMatch &&
    Number.isFinite(requestedDate.getTime()) &&
    requestedDate.toISOString().slice(0, 10) === requestedDay &&
    (!year || year === requestedDay.slice(0, 4)) &&
    (!month || month === requestedDay.slice(0, 7))
      ? {
          gte: new Date(`${requestedDay}T00:00:00.000Z`),
          lt: new Date(
            Date.UTC(
              Number(dayMatch[1]),
              Number(dayMatch[2]) - 1,
              Number(dayMatch[3]) + 1,
            ),
          ),
        }
      : undefined;
  const day = dayRange ? requestedDay : "";
  const requestedType = firstValue(params.type);
  const requestedCategory = firstValue(params.category);
  const requestedImportId = firstValue(params.importId) ?? "";
  const type =
    requestedType && isTransactionType(requestedType) ? requestedType : "";
  const categories = await prisma.category.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  const categoryId =
    requestedCategory &&
    (requestedCategory === "uncategorized" ||
      categories.some((category) => category.id === requestedCategory))
      ? requestedCategory
      : "";
  const validImport = requestedImportId
    ? await prisma.import.findUnique({
        where: { id: requestedImportId },
        select: { id: true },
      })
    : null;
  const importId = validImport?.id ?? "";
  const filters = {
    ...(year ? { year } : {}),
    ...(month ? { month } : {}),
    ...(type ? { type } : {}),
    ...(categoryId ? { category: categoryId } : {}),
    ...(day ? { dia: day } : {}),
    ...(importId ? { importId } : {}),
  };
  const where = {
    ...(dayRange
      ? { occurredAt: dayRange }
      : (monthRange ?? yearRange)
        ? { occurredAt: monthRange ?? yearRange }
        : {}),
    ...(type ? { type } : {}),
    ...(categoryId
      ? { categoryId: categoryId === "uncategorized" ? null : categoryId }
      : {}),
    ...(categoryId === "uncategorized"
      ? {
          AND: {
            type: {
              in: transactionTypes.filter(
                (value) => categoryType(value) !== null,
              ),
            },
          },
        }
      : {}),
    ...(importId ? { importId } : {}),
  };
  const pageSize = 20;
  const total = await prisma.transaction.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const rawPage = firstValue(params.page) ?? "1";
  const requestedPage =
    /^\d+$/.test(rawPage) && Number.isSafeInteger(Number(rawPage))
      ? Number(rawPage)
      : 1;
  const page = Math.max(1, Math.min(requestedPage, pageCount));
  const offset = (page - 1) * pageSize;
  const pageHref = (value: number) =>
    `/transacoes?${new URLSearchParams({ ...filters, page: String(value) })}`;
  const returnTo = pageHref(page);
  const transactions = await prisma.transaction.findMany({
    where,
    include: { account: true, category: true },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    skip: offset,
    take: pageSize,
  });
  const hasFilters = Boolean(
    year || month || type || categoryId || day || importId,
  );

  return (
    <PageShell>
      <section aria-labelledby="transactions-title">
        <div className="mb-8">
          <h1
            className="text-3xl font-medium tracking-tight sm:text-4xl"
            id="transactions-title"
          >
            Transações
          </h1>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center rounded-lg bg-[var(--foreground)] px-5 text-sm font-medium text-white"
              href="/transacoes/nova"
            >
              Nova transação
            </Link>
            <Link
              className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-5 text-sm font-medium"
              href="/importar"
            >
              Importar arquivos
            </Link>
            <Link
              className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-5 text-sm font-medium"
              href="/importar/historico"
            >
              Histórico de importações
            </Link>
          </div>
        </div>

        {successMessage ? (
          <p
            className="mb-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
            role="status"
          >
            {successMessage === "criada"
              ? "Transação criada com sucesso."
              : successMessage === "atualizada"
                ? "Transação atualizada com sucesso."
                : successMessage === "importadas"
                  ? `${importedCount} novas transações importadas; ${duplicateCount} repetidas ignoradas.`
                  : "Transação excluída com sucesso."}
          </p>
        ) : null}
        {noticeError ? (
          <p
            className="mb-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
            role="alert"
          >
            Não foi possível concluir a operação. Verifique os dados e tente
            novamente.
          </p>
        ) : null}
        {firstValue(params.categoriaStatus) === "atualizada" ? (
          <p
            className="mb-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
            role="status"
          >
            Categoria atualizada.
          </p>
        ) : null}

        <TransactionFilters
          importId={importId}
          year={year}
          month={month}
          day={day}
          years={years}
          type={type}
          categoryId={categoryId}
          categories={categories}
        />

        <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white/80">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <h2 className="font-medium">Todas as transações</h2>
            <span className="text-sm text-[var(--muted)]">
              {total > 0
                ? `${offset + 1}–${offset + transactions.length} de ${total}`
                : 0}{" "}
              {total === 1 ? "registro" : "registros"}
              {day
                ? ` em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))}`
                : ""}
            </span>
          </div>
          <TransactionTable
            transactions={transactions}
            categories={categories}
            returnTo={returnTo}
            hasFilters={hasFilters}
            yearFiltered={Boolean(year)}
          />
          {total > 0 ? (
            <Pagination
              page={page}
              pageCount={pageCount}
              previousHref={pageHref(page - 1)}
              nextHref={pageHref(page + 1)}
            />
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}
