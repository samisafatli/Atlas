import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AssetSnapshotForm } from "../../snapshot-form";

export const metadata = { title: "Novo snapshot — Atlas" };

export default async function NewSnapshotPage() {
  const accounts = await prisma.assetAccount.findMany({
    orderBy: [{ institution: "asc" }, { name: "asc" }],
  });
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
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
    </main>
  );
}
