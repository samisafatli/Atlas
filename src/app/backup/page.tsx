import { RestoreForm } from "./restore-form";
import { ClearForm } from "./clear-form";

export const metadata = { title: "Backup e restauração — Atlas" };

export default function BackupPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
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
            Use um JSON exportado pelo Atlas para voltar ao estado salvo naquele
            arquivo, incluindo transações, regras e patrimônio. A restauração
            substitui todos os dados atuais; não mescla registros. Lançamentos
            criados depois do backup deixarão de aparecer. CSVs do banco não são
            backups do Atlas e devem ser enviados em Importar CSV.
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
    </main>
  );
}
