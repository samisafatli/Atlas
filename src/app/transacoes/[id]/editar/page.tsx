import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TransactionForm } from "../../form";

export const metadata = { title: "Editar transação — Atlas" };

export default async function EditTransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [transaction, categories, accounts] = await Promise.all([
    prisma.transaction.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.account.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!transaction) notFound();
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <Link className="text-sm text-[var(--muted)]" href="/transacoes">
        ← Transações
      </Link>
      <h1 className="my-8 text-3xl font-medium">Editar transação</h1>
      <TransactionForm
        categories={categories}
        accounts={accounts}
        transaction={transaction}
        error={query.erro === "dados"}
      />
    </main>
  );
}
