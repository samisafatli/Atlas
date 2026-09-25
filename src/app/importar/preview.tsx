"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseNubankCsv, type ImportedTransaction } from "@/lib/nubank-csv";

function formatAmount(cents: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(cents) / 100);
}

export function ImportPreview() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<ImportedTransaction[]>([]);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  async function selectFile(file?: File) {
    setError("");
    setReady(false);
    setTransactions([]);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Selecione um arquivo .csv exportado pelo Nubank.");
      return;
    }
    try {
      const entries = parseNubankCsv(await file.text());
      if (entries.length === 0) {
        setError(
          "Não encontrei transações válidas nesse arquivo. Confira as colunas e os dados.",
        );
        return;
      }
      setFilename(file.name);
      setTransactions(entries);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível ler esse CSV.",
      );
    }
  }

  function continueImport() {
    sessionStorage.setItem(
      "atlas-import-preview",
      JSON.stringify({ filename, transactions }),
    );
    setReady(true);
    router.push("/importar/salvar");
  }

  return (
    <div className="grid gap-6">
      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void selectFile(event.dataTransfer.files[0]);
        }}
        className="grid cursor-pointer gap-2 rounded-2xl border border-dashed border-[var(--accent)] bg-white/70 p-8 text-center"
      >
        <span className="font-medium">Selecione o CSV do Nubank</span>
        <span className="text-sm text-[var(--muted)]">
          Clique para escolher ou arraste um CSV. O arquivo será lido localmente
          para montar a prévia.
        </span>
        <input
          accept=".csv,text/csv"
          className="mx-auto mt-2 max-w-full text-sm"
          type="file"
          onChange={(event) => selectFile(event.target.files?.[0])}
        />
      </label>
      {error ? (
        <p
          className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {transactions.length ? (
        <section
          className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white/80"
          aria-label="Prévia do arquivo"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
            <div>
              <h2 className="font-medium">Prévia: {filename}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {transactions.length} transações encontradas
              </p>
            </div>
            <button
              className="text-sm text-[var(--accent)] underline"
              onClick={() => selectFile()}
              type="button"
            >
              Escolher outro arquivo
            </button>
          </div>
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="sticky top-0 bg-[#f7f8f5] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Descrição</th>
                  <th className="px-5 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {transactions.slice(0, 100).map((transaction, index) => (
                  <tr key={`${transaction.date}-${index}`}>
                    <td className="whitespace-nowrap px-5 py-3">
                      {new Intl.DateTimeFormat("pt-BR", {
                        timeZone: "UTC",
                      }).format(new Date(`${transaction.date}T12:00:00Z`))}
                    </td>
                    <td className="px-5 py-3">{transaction.description}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      {transaction.type === "EXPENSE" ? "− " : "+ "}
                      {formatAmount(transaction.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {transactions.length > 100 ? (
            <p className="border-t border-[var(--line)] px-5 py-3 text-xs text-[var(--muted)]">
              Mostrando as primeiras 100 linhas. As {transactions.length}{" "}
              transações serão consideradas.
            </p>
          ) : null}
        </section>
      ) : null}
      {ready ? (
        <p
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
          role="status"
        >
          Prévia preparada. Nenhuma transação foi salva nesta etapa.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Link
          className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-5 text-sm"
          href="/transacoes"
        >
          Cancelar
        </Link>
        <button
          className="min-h-11 rounded-lg bg-[var(--foreground)] px-5 text-sm font-medium text-white disabled:opacity-50"
          disabled={!transactions.length}
          onClick={continueImport}
          type="button"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
