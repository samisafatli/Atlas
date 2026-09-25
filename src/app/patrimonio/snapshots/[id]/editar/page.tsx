import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AssetSnapshotForm } from "../../../snapshot-form";

export const metadata = { title: "Editar snapshot — Atlas" };

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
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <Link className="text-sm text-[var(--muted)]" href="/patrimonio">
        ← Patrimônio
      </Link>
      <h1 className="my-8 text-3xl font-medium">Editar snapshot</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Esta alteração é explícita e atualiza o registro histórico.
      </p>
      <AssetSnapshotForm accounts={accounts} snapshot={snapshot} />
    </main>
  );
}
