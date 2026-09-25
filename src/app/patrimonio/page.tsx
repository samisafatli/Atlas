import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/finance-format";
import { saveAssetAccount, deleteAssetAccount } from "./actions";
import { SnapshotChart } from "./snapshot-chart";
import { ConfirmSnapshotDelete } from "./snapshot-delete";

const assetTypeLabels: Record<string, string> = {
  CHECKING: "Conta corrente",
  FIXED_INCOME: "Renda fixa",
  STOCKS: "Ações",
  ETF: "ETF",
  CRYPTO: "Cripto",
  INTERNATIONAL: "Exterior",
  OTHER: "Outros",
};

export const metadata = { title: "Patrimônio — Atlas" };

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const [accounts, snapshots, query] = await Promise.all([
    prisma.assetAccount.findMany({
      orderBy: [{ institution: "asc" }, { name: "asc" }],
    }),
    prisma.assetSnapshot.findMany({ orderBy: { snapshotDate: "asc" } }),
    searchParams,
  ]);
  const errors: Record<string, string> = {
    conta: "Informe o nome, a instituição e um tipo válido.",
    duplicada: "Já existe uma conta com esse nome e instituição.",
    historico: "Esta conta aparece em snapshots e não pode ser excluída.",
    data: "Informe uma data válida.",
    valor: "Confira os valores informados.",
    "sem-contas": "Cadastre pelo menos uma conta patrimonial primeiro.",
    snapshot:
      "Não foi possível salvar. Talvez já exista um snapshot nessa data.",
  };
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
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
      <section>
        <h1 className="text-3xl font-medium">Patrimônio</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Cadastre ativos e registre snapshots mensais. Os valores históricos só
          mudam quando você edita explicitamente um snapshot.
        </p>
        {query.erro ? (
          <p
            className="my-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
            role="alert"
          >
            {errors[query.erro] ??
              "Ocorreu um erro. Confira os dados e tente de novo."}
          </p>
        ) : null}
        {query.sucesso ? (
          <p
            className="my-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
            role="status"
          >
            Alteração salva.
          </p>
        ) : null}
        <section className="mt-8" aria-labelledby="accounts-title">
          <h2 className="mb-4 text-xl font-medium" id="accounts-title">
            Contas e ativos
          </h2>
          <form
            action={saveAssetAccount}
            className="mb-5 grid gap-3 rounded-xl border border-[var(--line)] bg-white/80 p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
          >
            <label className="grid gap-2 text-sm">
              Nome
              <input
                className="min-h-10 rounded border border-[var(--line)] px-3"
                name="name"
                required
                placeholder="Ex.: Carteira de investimentos"
              />
            </label>
            <label className="grid gap-2 text-sm">
              Instituição
              <input
                className="min-h-10 rounded border border-[var(--line)] px-3"
                name="institution"
                required
                placeholder="Ex.: Rico"
              />
            </label>
            <label className="grid gap-2 text-sm">
              Tipo
              <select
                className="min-h-10 rounded border border-[var(--line)] px-3"
                name="type"
              >
                {Object.entries(assetTypeLabels).map(([type, label]) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="min-h-10 rounded-lg bg-[var(--foreground)] px-4 text-sm font-medium text-white"
              type="submit"
            >
              Adicionar ativo
            </button>
          </form>
          {accounts.length ? (
            <div className="grid gap-3">
              {accounts.map((account) => (
                <article
                  className="grid gap-3 rounded-xl border border-[var(--line)] bg-white/70 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  key={account.id}
                >
                  <p className="text-sm font-medium">
                    {account.name}
                    <span className="ml-2 text-[var(--muted)]">
                      · {account.institution} ·{" "}
                      {assetTypeLabels[account.type] ?? account.type}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <form
                      action={saveAssetAccount}
                      className="flex flex-wrap gap-2"
                    >
                      <input name="id" type="hidden" value={account.id} />
                      <input
                        aria-label="Nome do ativo"
                        className="h-9 w-36 rounded border border-[var(--line)] px-2 text-sm"
                        name="name"
                        defaultValue={account.name}
                        required
                      />
                      <input
                        aria-label="Instituição"
                        className="h-9 w-28 rounded border border-[var(--line)] px-2 text-sm"
                        name="institution"
                        defaultValue={account.institution}
                        required
                      />
                      <select
                        aria-label="Tipo"
                        className="h-9 rounded border border-[var(--line)] px-2 text-sm"
                        name="type"
                        defaultValue={account.type}
                      >
                        {Object.entries(assetTypeLabels).map(
                          ([type, label]) => (
                            <option key={type} value={type}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                      <button
                        className="text-sm text-[var(--accent)] underline"
                        type="submit"
                      >
                        Salvar
                      </button>
                    </form>
                    <form action={deleteAssetAccount}>
                      <input name="id" type="hidden" value={account.id} />
                      <button
                        className="text-sm text-rose-700 underline"
                        type="submit"
                      >
                        Excluir
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-[var(--line)] p-5 text-sm text-[var(--muted)]">
              Cadastre uma conta, como Nubank, Rico ou uma conta internacional.
            </p>
          )}
        </section>
        <section className="mt-10" aria-labelledby="snapshots-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-medium" id="snapshots-title">
              Histórico patrimonial
            </h2>
            <Link
              className="inline-flex min-h-10 items-center rounded-lg bg-[var(--foreground)] px-4 text-sm font-medium text-white"
              href="/patrimonio/snapshots/novo"
            >
              Registrar snapshot
            </Link>
          </div>
          <SnapshotChart snapshots={snapshots} />
          {snapshots.length ? (
            <div className="mt-5 overflow-hidden rounded-xl border border-[var(--line)] bg-white/80">
              <ul className="divide-y divide-[var(--line)]">
                {snapshots.toReversed().map((snapshot) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    key={snapshot.id}
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "long",
                          timeZone: "UTC",
                        }).format(snapshot.snapshotDate)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {formatCents(snapshot.totalCents)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        className="text-sm text-[var(--accent)] underline"
                        href={`/patrimonio/snapshots/${snapshot.id}/editar`}
                      >
                        Editar snapshot
                      </Link>
                      <ConfirmSnapshotDelete id={snapshot.id} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
