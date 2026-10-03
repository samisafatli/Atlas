import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { AssetSnapshotForm } from "../../snapshot-form";
import { PageShell } from "@/app/page-shell";

export default async function NewSnapshotPage() {
  const prisma = await getPrisma();
  const accounts = await prisma.assetAccount.findMany({
    orderBy: [{ institution: "asc" }, { name: "asc" }],
  });
  return (
    <PageShell width="narrow">
      <Link className="text-sm text-[var(--muted)]" href="/patrimonio">
        ← Patrimônio
      </Link>
      <h1 className="my-8 text-3xl font-medium">Registrar snapshot</h1>
      {accounts.length ? (
        <AssetSnapshotForm accounts={accounts} />
      ) : (
        <p role="alert">
          Cadastre pelo menos uma conta patrimonial antes de registrar valores.
        </p>
      )}
    </PageShell>
  );
}
