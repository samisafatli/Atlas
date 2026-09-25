"use client";

import { saveNubankImport } from "./actions";
import type { ImportedTransaction } from "@/lib/nubank-csv";
import { useEffect, useState } from "react";
import { countImportDuplicates } from "./duplicate-count";

export function SaveImportForm({
  accounts,
}: {
  accounts: { id: string; name: string }[];
}) {
  const [preview, setPreview] = useState<{
    filename: string;
    transactions: ImportedTransaction[];
  } | null>(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [counts, setCounts] = useState<{
    existing: number;
    newCount: number;
    suggestions: { description: string; category: string }[];
  } | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = sessionStorage.getItem("atlas-import-preview");
        if (saved)
          setPreview(
            JSON.parse(saved) as {
              filename: string;
              transactions: ImportedTransaction[];
            },
          );
      } catch {
        setPreview(null);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!preview || !accountId) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void countImportDuplicates(preview.transactions, accountId).then(
        (result) => {
          if (active) setCounts(result);
        },
      );
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [preview, accountId]);
  if (!preview)
    return (
      <div className="grid gap-4">
        <p className="text-sm text-[var(--muted)]" role="status">
          Carregando a prévia selecionada…
        </p>
        <a className="text-sm text-[var(--accent)] underline" href="/importar">
          Voltar à prévia
        </a>
      </div>
    );
  return (
    <form
      action={saveNubankImport}
      className="grid gap-5 rounded-2xl border border-[var(--line)] bg-white/80 p-5"
    >
      <input type="hidden" name="filename" value={preview.filename} />
      <input
        type="hidden"
        name="transactions"
        value={JSON.stringify(preview.transactions)}
      />
      <p className="text-sm">
        {preview.transactions.length} transações prontas para importar do
        arquivo <strong>{preview.filename}</strong>.
      </p>
      <label className="grid gap-2 text-sm font-medium">
        Conta de destino
        <select
          name="accountId"
          required
          value={accountId}
          onChange={(event) => {
            setAccountId(event.target.value);
            setCounts(null);
          }}
          className="min-h-11 rounded-lg border border-[var(--line)] px-3 font-normal"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>
      {counts ? (
        <div className="grid gap-3">
          <p className="rounded-lg bg-[#f7f8f5] p-3 text-sm" role="status">
            {counts.newCount} novas transações; {counts.existing} já existentes
            ou repetidas neste arquivo.
          </p>
          {counts.suggestions.length ? (
            <div className="rounded-lg border border-[var(--line)] p-3">
              <h2 className="text-sm font-medium">
                Categorias sugeridas pelas regras
              </h2>
              <ul className="mt-2 grid gap-1 text-sm text-[var(--muted)]">
                {counts.suggestions.slice(0, 8).map((suggestion, index) => (
                  <li key={`${suggestion.description}-${index}`}>
                    {suggestion.description} → {suggestion.category}
                  </li>
                ))}
              </ul>
              {counts.suggestions.length > 8 ? (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  e mais {counts.suggestions.length - 8} sugestões. Você poderá
                  revisar as categorias na lista após importar.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]" role="status">
          Verificando transações existentes…
        </p>
      )}
      <button
        className="min-h-11 rounded-lg bg-[var(--foreground)] px-5 text-sm font-medium text-white disabled:opacity-50"
        disabled={!counts}
        type="submit"
      >
        Importar {counts ? counts.newCount : ""} transações novas
      </button>
    </form>
  );
}
