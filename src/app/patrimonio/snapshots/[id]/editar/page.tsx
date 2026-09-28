import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AssetSnapshotForm } from "../../../snapshot-form";
import { PageShell } from "@/app/page-shell";

export default async function EditSnapshotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [snapshot, accounts] = await Promise.all([
    prisma.assetSnapshot.findUnique({
      where: { id },
      include: { values: true },
    }),
    prisma.assetAccount.findMany({
      orderBy: [{ institution: "asc" }, { name: "asc" }],
    }),
  ]);
  if (!snapshot) notFound();
  return (
    <PageShell width="narrow">
      <Link className="text-sm text-[var(--muted)]" href="/patrimonio">
        ← Patrimônio
      </Link>
      <h1 className="my-8 text-3xl font-medium">Editar snapshot</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Esta alteração é explícita e atualiza o registro histórico.
      </p>
      <AssetSnapshotForm accounts={accounts} snapshot={snapshot} />
    </PageShell>
  );
}
