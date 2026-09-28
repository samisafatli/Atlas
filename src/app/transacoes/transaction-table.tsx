import Link from "next/link";
import { Inbox, Pencil, Search } from "lucide-react";
import { ConfirmDelete } from "./confirm-delete";
import { CategorySelect } from "./category-select";
import { updateTransactionCategory } from "./actions";
import { formatCents } from "@/lib/finance-format";
import {
  categoryType,
  typeLabels,
  transactionSign,
  typeTone,
} from "@/lib/transaction-types";

type Row = {
  id: string;
  description: string;
  amountCents: bigint;
  type: string;
  occurredAt: Date;
  categoryId: string | null;
  ownershipEstimated: boolean;
  account: { name: string; currency: string };
};

export function TransactionTable({
  transactions,
  categories,
  returnTo,
  hasFilters,
  yearFiltered,
}: {
  transactions: Row[];
  categories: { id: string; name: string; type: string }[];
  returnTo: string;
  hasFilters: boolean;
  yearFiltered: boolean;
}) {
  // The year is noise when the page cannot mix years with the current one.
  const currentYear = new Date().getUTCFullYear();
  const dateFormat = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    ...(yearFiltered ||
    transactions.every(
      (transaction) => transaction.occurredAt.getUTCFullYear() === currentYear,
    )
      ? {}
      : { year: "numeric" }),
    timeZone: "UTC",
  });
  return transactions.length === 0 ? (
    <div className="px-6 py-16 text-center">
      <div
        aria-hidden="true"
        className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-[#e9f0eb] text-xl text-[var(--accent)]"
      >
        {hasFilters ? (
          <Search className="size-5" />
        ) : (
          <Inbox className="size-5" />
        )}
      </div>
      <h3 className="font-medium">
        {hasFilters
          ? "Nenhuma transação encontrada"
          : "Ainda não há transações"}
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
        {hasFilters
          ? "Tente mudar ou limpar os filtros para ver outros resultados."
          : "Quando houver transações registradas, elas aparecerão aqui."}
      </p>
      {hasFilters ? (
        <Link
          className="mt-5 inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
          href="/transacoes"
        >
          Limpar filtros
        </Link>
      ) : null}
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-[#f7f8f5] text-xs tracking-wide text-[var(--muted)] uppercase">
          <tr>
            <th className="px-6 py-3 font-medium" scope="col">
              Data
            </th>
            <th className="px-6 py-3 font-medium" scope="col">
              Descrição
            </th>
            <th className="px-6 py-3 font-medium" scope="col">
              Categoria
            </th>
            <th className="px-6 py-3 font-medium" scope="col">
              Conta
            </th>
            <th className="px-6 py-3 text-right font-medium" scope="col">
              Valor
            </th>
            <th className="px-6 py-3 text-right font-medium" scope="col">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {transactions.map((transaction) => {
            const tone = typeTone(transaction.type);
            const typeLabel = typeLabels[transaction.type] ?? transaction.type;
            const amountSign = transactionSign(transaction.type);

            return (
              <tr key={transaction.id}>
                <td className="whitespace-nowrap px-6 py-4 text-[var(--muted)]">
                  <time dateTime={transaction.occurredAt.toISOString()}>
                    {dateFormat.format(transaction.occurredAt)}
                  </time>
                </td>
                <td className="px-6 py-4 font-medium">
                  <span>{transaction.description}</span>
                  <span className={"mt-1 block text-xs font-normal " + tone}>
                    {typeLabel}
                  </span>
                  {transaction.ownershipEstimated ? (
                    <span className="mt-1 block text-xs font-normal text-amber-800">
                      Divisão estimada com sua mãe
                    </span>
                  ) : null}
                </td>
                <td className="px-6 py-4 text-[var(--muted)]">
                  {categoryType(transaction.type) === null ? (
                    <span>Não se aplica</span>
                  ) : (
                    <form
                      action={updateTransactionCategory.bind(
                        null,
                        transaction.id,
                      )}
                    >
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <CategorySelect
                        key={transaction.categoryId ?? "uncategorized"}
                        description={transaction.description}
                        categoryId={transaction.categoryId}
                        categories={categories.filter(
                          (category) =>
                            category.type === categoryType(transaction.type),
                        )}
                      />
                    </form>
                  )}
                </td>
                <td className="px-6 py-4 text-[var(--muted)]">
                  {transaction.account.name}
                </td>
                <td
                  className={
                    "whitespace-nowrap px-6 py-4 text-right font-semibold " +
                    tone
                  }
                >
                  {amountSign}
                  {formatCents(
                    transaction.amountCents,
                    transaction.account.currency,
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Link
                      aria-label={`Editar “${transaction.description}”`}
                      className="grid size-9 place-items-center rounded-lg text-[var(--accent)] transition hover:bg-[#e9f0eb]"
                      href={`/transacoes/${transaction.id}/editar`}
                      title="Editar"
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                    </Link>
                    <ConfirmDelete
                      id={transaction.id}
                      description={transaction.description}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
