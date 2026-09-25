import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TransactionForm } from "../form";

export const metadata = { title: "Nova transação — Atlas" };

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const [categories, accounts, params] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.account.findMany({ orderBy: { name: "asc" } }),
    searchParams,
  ]);
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <Link className="text-sm text-[var(--muted)]" href="/transacoes">
        ← Transações
      </Link>
      <h1 className="my-8 text-3xl font-medium">Nova transação</h1>
      {accounts.length &&
      categories.some((category) => category.type === "EXPENSE") ? (
        <TransactionForm
          categories={categories}
          accounts={accounts}
          error={params.erro === "dados"}
          requireCategory
        />
      ) : accounts.length ? (
        <p role="alert">Cadastre uma categoria antes de criar transações.</p>
      ) : (
        <p role="alert">Cadastre uma conta antes de criar transações.</p>
      )}
    </main>
  );
}
