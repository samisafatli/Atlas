import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SaveImportForm } from "../save-form";

export const metadata = { title: "Salvar importação — Atlas" };

export default async function SaveImportPage() {
  const accounts = await prisma.account.findMany({ orderBy: { name: "asc" } });
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <Link className="text-sm text-[var(--muted)]" href="/importar">
        ← Prévia do CSV
      </Link>
      <h1 className="my-8 text-3xl font-medium">Concluir importação</h1>
      {accounts.length ? (
        <SaveImportForm accounts={accounts} />
      ) : (
        <p role="alert">Cadastre uma conta antes de importar transações.</p>
      )}
    </main>
  );
}
