import Link from "next/link";
import { RestoreForm } from "./restore-form";

export const metadata = { title: "Backup e restauração — Atlas" };

export default function BackupPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-10 flex justify-between">
        <Link
          className="text-sm font-semibold tracking-[0.2em] text-[var(--accent)] uppercase"
          href="/"
        >
          Atlas
        </Link>
        <Link className="text-sm text-[var(--muted)]" href="/dashboard">
          ← Dashboard
        </Link>
      </header>
      <h1 className="text-3xl font-medium">Backup e restauração</h1>
      <section className="mt-7 grid gap-6">
        <article className="rounded-2xl border border-[var(--line)] bg-white/80 p-5">
          <h2 className="font-medium">Exportar seus dados</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Gera um arquivo JSON completo com transações, categorias, contas,
            regras de categoria, histórico de importações e snapshots
            patrimoniais.
          </p>
          <a
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[var(--foreground)] px-5 text-sm font-medium text-white"
            href="/api/backup"
          >
            Baixar backup JSON
          </a>
          <p className="mt-3 text-xs text-[var(--muted)]">
            O navegador salva o arquivo na pasta configurada para downloads.
          </p>
        </article>
        <article className="rounded-2xl border border-[var(--line)] bg-white/80 p-5">
          <h2 className="mb-2 font-medium">Restaurar um backup</h2>
          <p className="mb-4 text-sm leading-6 text-[var(--muted)]">
            O arquivo é validado antes da restauração. O Atlas pede confirmação
            e salva uma cópia de proteção dos dados atuais na pasta{" "}
            <code>backups</code>, ao lado do banco SQLite.
          </p>
          <RestoreForm />
        </article>
      </section>
    </main>
  );
}
