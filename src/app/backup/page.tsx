import { RestoreForm } from "./restore-form";
import { ClearForm } from "./clear-form";
import { PageShell } from "@/app/page-shell";

export default function BackupPage() {
  return (
    <PageShell width="narrow">
      <h1 className="text-3xl font-medium">Backup e restauração</h1>
      <section className="mt-7 grid gap-6">
        <article className="rounded-2xl border border-[var(--line)] bg-white/80 p-5">
          <h2 className="font-medium">Exportar seus dados</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Exporte todos os seus dados em um arquivo JSON.
          </p>
          <a
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[var(--foreground)] px-5 text-sm font-medium text-white"
            href="/api/backup"
          >
            Baixar backup JSON
          </a>
        </article>
        <article className="rounded-2xl border border-[var(--line)] bg-white/80 p-5">
          <h2 className="mb-2 font-medium">Restaurar um backup</h2>
          <p className="mb-4 text-sm leading-6 text-[var(--muted)]">
            Restaure um arquivo JSON do Atlas. Todos os dados atuais serão
            substituídos pelos dados do backup.
          </p>
          <p className="mb-4 text-sm leading-6 text-[var(--muted)]">
            O arquivo é validado antes da restauração. O Atlas pede confirmação
            e salva uma cópia de proteção dos dados atuais na pasta{" "}
            <code>backups</code>, ao lado do banco SQLite.
          </p>
          <RestoreForm />
        </article>
        <article className="rounded-2xl border border-rose-200 bg-white/80 p-5">
          <h2 className="mb-2 font-medium">Limpar dados</h2>
          <p className="mb-4 text-sm leading-6 text-[var(--muted)]">
            Antes de apagar, o Atlas salva um backup JSON completo em{" "}
            <code>backups</code>, ao lado do banco. Se não conseguir salvar a
            cópia, a limpeza é cancelada. Os CSVs originais e backups existentes
            permanecem no computador.
          </p>
          <ClearForm />
        </article>
      </section>
    </PageShell>
  );
}
