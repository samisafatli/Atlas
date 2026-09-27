"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/dashboard", "Dashboard"],
  ["/transacoes", "Transações"],
  ["/importar", "Importar arquivos"],
  ["/regras", "Regras"],
  ["/recorrentes", "Recorrentes"],
  ["/patrimonio", "Patrimônio"],
  ["/backup", "Backup"],
] as const;

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b border-[var(--line)] bg-white/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <Link
          href="/dashboard"
          aria-label="Atlas — Dashboard"
          className="w-fit rounded text-sm font-semibold tracking-[0.2em] text-[var(--accent)] uppercase focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Atlas
        </Link>
        <nav aria-label="Navegação principal" className="flex flex-wrap gap-1">
          {links.map(([href, label]) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${active ? "bg-[var(--foreground)] font-medium text-white" : "text-[var(--muted)] hover:bg-[#e9f0eb] hover:text-[var(--foreground)]"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
