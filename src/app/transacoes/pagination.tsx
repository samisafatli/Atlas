import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
          className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-[var(--line)] px-4 text-sm hover:bg-[#e9f0eb]"
          href={previousHref}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Anterior
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex items-center gap-1 px-4 text-sm text-[var(--muted)] opacity-50"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Anterior
        </span>
      )}
      <span className="text-sm text-[var(--muted)]">
        Página {page} de {pageCount}
      </span>
      {page < pageCount ? (
        <Link
          className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-[var(--line)] px-4 text-sm hover:bg-[#e9f0eb]"
          href={nextHref}
        >
          Próxima
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex items-center gap-1 px-4 text-sm text-[var(--muted)] opacity-50"
        >
          Próxima
          <ChevronRight aria-hidden="true" className="size-4" />
        </span>
      )}
    </nav>
  );
}
