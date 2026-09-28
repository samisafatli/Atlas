import Link from "next/link";

export function Pagination({
  page,
  pageCount,
  previousHref,
  nextHref,
}: {
  page: number;
  pageCount: number;
  previousHref: string;
  nextHref: string;
}) {
  return (
    <nav
      aria-label="Paginação das transações"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-4"
    >
      {page > 1 ? (
        <Link
          className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-4 text-sm hover:bg-[#e9f0eb]"
          href={previousHref}
        >
          ← Anterior
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="px-4 text-sm text-[var(--muted)] opacity-50"
        >
          ← Anterior
        </span>
      )}
      <span className="text-sm text-[var(--muted)]">
        Página {page} de {pageCount}
      </span>
      {page < pageCount ? (
        <Link
          className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-4 text-sm hover:bg-[#e9f0eb]"
          href={nextHref}
        >
          Próxima →
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="px-4 text-sm text-[var(--muted)] opacity-50"
        >
          Próxima →
        </span>
      )}
    </nav>
  );
}
