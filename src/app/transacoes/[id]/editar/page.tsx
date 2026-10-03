import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { TransactionForm } from "../../form";
import { PageShell } from "@/app/page-shell";
import { findInstallmentSiblings } from "@/lib/installments";

export default async function EditTransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const prisma = await getPrisma();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [transaction, categories, accounts] = await Promise.all([
    prisma.transaction.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.account.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!transaction) notFound();
  const installments = await findInstallmentSiblings(prisma, transaction);
  return (
    <PageShell width="narrow">
      <Link className="text-sm text-[var(--muted)]" href="/transacoes">
        ← Transações
      </Link>
      <h1 className="my-8 text-3xl font-medium">Editar transação</h1>
      <TransactionForm
        categories={categories}
        accounts={accounts}
        transaction={transaction}
        installments={installments}
        error={query.erro === "dados"}
      />
    </PageShell>
  );
}
