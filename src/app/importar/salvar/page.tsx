import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SaveImportForm } from "../save-form";
import { PageShell } from "@/app/page-shell";

export const dynamic = "force-dynamic";

export default async function SaveImportPage() {
  const accounts = await prisma.account.findMany({ orderBy: { name: "asc" } });
  return (
    <PageShell width="narrow">
      <Link className="text-sm text-[var(--muted)]" href="/importar">
        ← Prévia do arquivo
      </Link>
      <h1 className="my-8 text-3xl font-medium">Concluir importação</h1>
      {accounts.length ? (
        <SaveImportForm accounts={accounts} />
      ) : (
        <p role="alert">Cadastre uma conta antes de importar transações.</p>
      )}
    </PageShell>
  );
}
