"use client";

import { saveNubankImport } from "./actions";
import type { ImportedTransaction } from "@/lib/nubank-csv";
import { useEffect, useState } from "react";
import { countImportDuplicates } from "./duplicate-count";
import { ImportSummary } from "./summary";
import { sourceLabels } from "@/lib/nubank-csv";
import { useFormStatus } from "react-dom";

function ImportButton({ count }: { count: number | null }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="min-h-11 rounded-lg bg-[var(--foreground)] hover:bg-accent px-5 text-sm font-medium text-on-accent disabled:opacity-50"
      disabled={pending || count === null}
      type="submit"
    >
      {pending
        ? "Importando arquivos…"
        : `Importar ${count ?? ""} transações novas`}
    </button>
  );
}

export function SaveImportForm({
  accounts,
}: {
  accounts: { id: string; name: string }[];
}) {
  const [preview, setPreview] = useState<
    | {
        filename: string;
        transactions: ImportedTransaction[];
      }[]
    | null
  >(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [error, setError] = useState("");
  const [counts, setCounts] = useState<{
    existing: number;
    newCount: number;
    suggestions: { description: string; category: string }[];
  } | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = sessionStorage.getItem("atlas-import-preview");
        if (saved) {
          const value = JSON.parse(saved);
          const files = Array.isArray(value.files) ? value.files : [value];
          if (
            files.length &&
            files.every(
              (file: { transactions?: ImportedTransaction[] }) =>
                file.transactions?.length &&
                ["CREDIT_CARD", "BANK_STATEMENT"].includes(
                  file.transactions[0].sourceType,
                ),
            )
          )
            setPreview(files);
        }
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
      void countImportDuplicates(
        preview.map((file) => file.transactions),
        accountId,
      ).then(
        (result) => {
          if (active) setCounts(result);
        },
        () => {
          if (active)
            setError(
              "Não foi possível verificar duplicatas. Volte à prévia e tente novamente.",
            );
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
          Selecione novamente o CSV ou OFX para gerar uma prévia com o formato
          atualizado.
        </p>
        <a className="text-sm text-[var(--accent)] underline" href="/importar">
          Voltar à prévia
        </a>
      </div>
    );
  return (
    <form
      action={saveNubankImport}
      className="grid gap-5 rounded-2xl border border-[var(--line)] bg-surface p-5"
    >
      <p className="text-sm text-[var(--muted)]">
        Sem identificador bancário, lançamentos iguais são contados por arquivo.
        Na reimportação, apenas ocorrências adicionais são incluídas. Prefira
        arquivos completos do período: recortes separados com compras idênticas
        podem ser confundidos com lançamentos já importados.
      </p>
      <input type="hidden" name="files" value={JSON.stringify(preview)} />
      <p className="text-sm">
        {preview.length} arquivos para importar na conta selecionada. Se forem
        de contas diferentes, importe em lotes separados.
      </p>
      {preview.map((file, index) => (
        <div key={index} className="rounded-lg border border-[var(--line)] p-3">
          <p className="font-medium">{file.filename}</p>
          <p className="text-sm">
            {sourceLabels[file.transactions[0].sourceType]} ·{" "}
            {file.transactions.length} lançamentos
          </p>
          <ImportSummary transactions={file.transactions} />
        </div>
      ))}
      {error ? <p role="alert">{error}</p> : null}
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
          <p className="rounded-lg bg-surface-2 p-3 text-sm" role="status">
            {counts.newCount} novas transações; {counts.existing} já existentes
            ou repetidas entre os arquivos selecionados.
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
      <ImportButton count={counts?.newCount ?? null} />
    </form>
  );
}
