"use client";

import { useState } from "react";
import { createTransaction, updateTransaction } from "./actions";
import { categoryType, typeFormLabels } from "@/lib/transaction-types";
import { formatCents } from "@/lib/finance-format";

type Props = {
  categories: { id: string; name: string; type: string }[];
  accounts: { id: string; name: string }[];
  transaction?: {
    id: string;
    description: string;
    amountCents: bigint;
    type: string;
    occurredAt: Date;
    categoryId: string | null;
    accountId: string;
    ownershipEstimated?: boolean;
    note?: string | null;
  };
  installments?: {
    id: string;
    index: number;
    total: number;
    occurredAt: Date;
    amountCents: bigint;
    note: string | null;
  }[];
  error?: boolean;
  requireCategory?: boolean;
};

export function TransactionForm({
  categories,
  accounts,
  transaction,
  installments = [],
  error,
  requireCategory = false,
}: Props) {
  const [type, setType] = useState(transaction?.type ?? "EXPENSE");
  const [categoryId, setCategoryId] = useState(
    transaction?.categoryId ??
      (requireCategory
        ? (categories.find((category) => category.type === "EXPENSE")?.id ?? "")
        : ""),
  );
  const action = transaction
    ? updateTransaction.bind(null, transaction.id)
    : createTransaction;
  return (
    <form
      action={action}
      className="grid gap-4 rounded-2xl border border-[var(--line)] bg-white/80 p-5 sm:grid-cols-2"
    >
      {transaction?.ownershipEstimated ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm sm:col-span-2">
          Divisão estimada com sua mãe: este pagamento foi considerado seu na
          revisão do histórico. A categoria descreve o gasto; esta indicação
          registra a incerteza sobre a quem ele pertence.
        </p>
      ) : null}
      {error ? (
        <p className="sm:col-span-2 text-sm text-rose-700" role="alert">
          Confira os campos obrigatórios e tente novamente.
        </p>
      ) : null}
      <label className="grid gap-2 text-sm font-medium">
        Descrição
        <input
          required
          maxLength={300}
          name="description"
          defaultValue={transaction?.description}
          className="min-h-11 rounded-lg border border-[var(--line)] px-3 font-normal"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Data
        <input
          required
          name="date"
          type="date"
          defaultValue={transaction?.occurredAt.toISOString().slice(0, 10)}
          className="min-h-11 rounded-lg border border-[var(--line)] px-3 font-normal"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Valor (R$)
        <input
          required
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          defaultValue={
            transaction
              ? (Number(transaction.amountCents) / 100).toFixed(2)
              : ""
          }
          className="min-h-11 rounded-lg border border-[var(--line)] px-3 font-normal"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Tipo
        <select
          required
          name="type"
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            if (
              !categories.some(
                (category) =>
                  category.id === categoryId &&
                  category.type === categoryType(event.target.value),
              )
            ) {
              setCategoryId(
                requireCategory
                  ? (categories.find(
                      (category) =>
                        category.type === categoryType(event.target.value),
                    )?.id ?? "")
                  : "",
              );
            }
          }}
          className="min-h-11 rounded-lg border border-[var(--line)] px-3 font-normal"
        >
          {Object.entries(typeFormLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {categoryType(type) === null ? (
        <div className="grid gap-2 text-sm font-medium">
          <span>Categoria</span>
          <p className="flex min-h-11 items-center text-[var(--muted)] font-normal">
            Não se aplica
          </p>
        </div>
      ) : (
        <label className="grid gap-2 text-sm font-medium">
          Categoria
          <select
            name="categoryId"
            required={requireCategory}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="min-h-11 rounded-lg border border-[var(--line)] px-3 font-normal"
          >
            {!requireCategory ? <option value="">Sem categoria</option> : null}
            {categories
              .filter((category) => category.type === categoryType(type))
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
        </label>
      )}
      <label className="grid gap-2 text-sm font-medium">
        Conta
        <select
          required
          name="accountId"
          defaultValue={transaction?.accountId ?? accounts[0]?.id ?? ""}
          className="min-h-11 rounded-lg border border-[var(--line)] px-3 font-normal"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">
        Observação (opcional)
        <input
          maxLength={300}
          name="note"
          defaultValue={transaction?.note ?? ""}
          placeholder="Ex.: presente de aniversário"
          className="min-h-11 rounded-lg border border-[var(--line)] px-3 font-normal"
        />
      </label>
      {installments.length ? (
        <fieldset className="grid gap-2 text-sm sm:col-span-2">
          <legend className="mb-2 font-medium">
            Aplicar a mesma observação também a:
          </legend>
          {installments.map((installment) => (
            <label className="flex items-center gap-2" key={installment.id}>
              <input
                defaultChecked
                name="installmentIds"
                type="checkbox"
                value={installment.id}
              />
              Parcela {installment.index}/{installment.total} ·{" "}
              {new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "medium",
                timeZone: "UTC",
              }).format(installment.occurredAt)}{" "}
              · {formatCents(installment.amountCents)}
              {installment.note ? (
                <span className="text-[var(--muted)]">
                  (atual: {installment.note})
                </span>
              ) : null}
            </label>
          ))}
        </fieldset>
      ) : null}
      <div className="flex gap-3 sm:col-span-2">
        <button
          className="min-h-11 rounded-lg bg-[var(--foreground)] px-5 text-sm font-medium text-white"
          type="submit"
        >
          {transaction ? "Salvar alterações" : "Salvar transação"}
        </button>
        <a
          className="inline-flex items-center px-2 text-sm text-[var(--muted)]"
          href="/transacoes"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
