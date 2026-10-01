import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sourceLabels } from "@/lib/nubank-csv";
import { PageShell } from "@/app/page-shell";
export const dynamic = "force-dynamic";

export default async function ImportHistoryPage() {
  const imports = await prisma.import.findMany({
    orderBy: { importedAt: "desc" },
  });
  return (
    <PageShell width="medium">
      <h1 className="text-3xl font-medium">Histórico de importações</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Arquivos processados e quantidade de novas transações gravadas.
      </p>
      {imports.length ? (
        <ul className="mt-7 divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)] bg-surface">
          {imports.map((item) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              key={item.id}
            >
              <div>
                <p className="font-medium">{item.filename}</p>
                <p className="text-sm">
                  {item.sourceType === "LEGACY"
                    ? "Importação antiga — revisar interpretação"
                    : sourceLabels[
                        item.sourceType as keyof typeof sourceLabels
                      ]}{" "}
                  · versão {item.parserVersion}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(item.importedAt)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm">{item.transactionCount} novas</span>
                <Link
                  className="text-sm text-[var(--accent)] underline"
                  href={`/transacoes?importId=${encodeURIComponent(item.id)}`}
                >
                  Ver lançamentos
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-7 rounded-xl border border-[var(--line)] p-6 text-sm text-[var(--muted)]">
          Nenhuma importação registrada ainda.
        </p>
      )}
    </PageShell>
  );
}
