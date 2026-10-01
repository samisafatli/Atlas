import Link from "next/link";
import { PeriodFilter } from "./period-filter";
import { typeFilterLabels } from "@/lib/transaction-types";

export function TransactionFilters({
  importId,
  year,
  month,
  day,
  years,
  type,
  categoryId,
  categories,
}: {
  importId: string;
  year: string;
  month: string;
  day: string;
  years: number[];
  type: string;
  categoryId: string;
  categories: { id: string; name: string }[];
}) {
  return (
    <form
      action="/transacoes"
      className="mb-8 grid gap-4 rounded-2xl border border-[var(--line)] bg-surface-2 p-5 sm:grid-cols-2 lg:grid-cols-[0.8fr_1fr_1fr_1fr_1.2fr_auto_auto] lg:items-end"
      method="get"
    >
      {importId ? (
        <input type="hidden" name="importId" value={importId} />
      ) : null}
      <PeriodFilter
        key={`${year}-${month}-${day}`}
        year={year}
        month={month}
        day={day}
        years={years}
      />

      <label className="grid gap-2 text-sm font-medium" htmlFor="type">
        Tipo
        <select
          className="min-h-11 rounded-lg border border-[var(--line)] bg-surface-2 px-3 font-normal outline-none focus:border-[var(--accent)]"
          id="type"
          name="type"
          defaultValue={type}
        >
          <option value="">Todos</option>
          {Object.entries(typeFilterLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm font-medium" htmlFor="category">
        Categoria
        <select
          className="min-h-11 rounded-lg border border-[var(--line)] bg-surface-2 px-3 font-normal outline-none focus:border-[var(--accent)]"
          id="category"
          name="category"
          defaultValue={categoryId}
        >
          <option value="">Todas</option>
          <option value="uncategorized">Sem categoria</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <button
        className="min-h-11 rounded-lg bg-[var(--foreground)] px-5 text-sm font-medium text-on-accent transition hover:bg-accent"
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
  );
}
