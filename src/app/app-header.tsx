"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Settings } from "lucide-react";

const links = [
  ["/dashboard", "Dashboard"],
  ["/transacoes", "Transações"],
  ["/importar", "Importar"],
  ["/recorrentes", "Recorrentes"],
  ["/patrimonio", "Patrimônio"],
] as const;

// Occasional maintenance screens stay one level down, at their own URLs.
const settingsLinks = [
  ["/categorias", "Categorias"],
  ["/regras", "Regras"],
  ["/backup", "Backup"],
] as const;

const itemClass = (active: boolean) =>
  `inline-flex min-h-11 items-center rounded-lg px-3 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${active ? "bg-surface-3 font-medium text-[var(--foreground)]" : "text-[var(--muted)] hover:bg-surface-2 hover:text-[var(--foreground)]"}`;

function SettingsMenu({ pathname }: { pathname: string }) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: Event) => {
      const element = menu.current;
      if (!element?.open) return;
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !element.contains(event.target as Node)
      ) {
        element.open = false;
        if (event instanceof KeyboardEvent)
          element.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  return (
    <details className="relative" ref={menu}>
      <summary
        className={`${itemClass(settingsLinks.some(([href]) => isActive(href)))} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
        title="Configurações"
      >
        <Settings aria-hidden="true" className="size-5" />
        <span className="sr-only">Configurações</span>
      </summary>
      <div className="absolute right-0 z-10 mt-2 grid min-w-44 gap-1 rounded-xl border border-[var(--line)] bg-surface-2 p-1 shadow-lg">
        {settingsLinks.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={itemClass(isActive(href))}
          >
            {label}
          </Link>
        ))}
      </div>
    </details>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b border-[var(--line)] bg-[var(--background)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <Link
          href="/dashboard"
          aria-label="Atlas — Dashboard"
          className="w-fit rounded text-base font-bold tracking-tight text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-4"
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
                className={itemClass(active)}
              >
                {label}
              </Link>
            );
          })}
          {/* Remounting on navigation closes the menu after a choice. */}
          <SettingsMenu key={pathname} pathname={pathname} />
        </nav>
      </div>
    </header>
  );
}
