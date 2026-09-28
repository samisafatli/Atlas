"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  parseNubankCsv,
  sourceLabels,
  type ImportedTransaction,
} from "@/lib/nubank-csv";
import { typeLabels, transactionSign } from "@/lib/transaction-types";
import { decodeOfx, parseOfx } from "@/lib/ofx";
import { ImportSummary } from "./summary";

function formatAmount(cents: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(cents) / 100);
}

export function ImportPreview() {
  const router = useRouter();
  const [files, setFiles] = useState<
    { filename: string; transactions: ImportedTransaction[] }[]
  >([]);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const sequence = useRef(0);
  const transactions = files[selected]?.transactions ?? [];
  const filename = files[selected]?.filename ?? "";

  async function selectFiles(input: FileList | File[] = []) {
    const request = ++sequence.current;
    setError("");
    setFiles([]);
    setSelected(0);
    setLoading(true);
    let currentName = "";
    try {
      const selectedFiles = Array.from(input);
      if (
        selectedFiles.length > 50 ||
        selectedFiles.reduce((sum, file) => sum + file.size, 0) >
          20 * 1024 * 1024
      )
        throw new Error(
          "Selecione até 50 arquivos, com no máximo 20 MB no total.",
        );
      const parsed = [];
      let total = 0;
      for (const file of selectedFiles) {
        currentName = file.name;
        if (!/\.(csv|ofx)$/i.test(file.name))
          throw new Error("Formato inválido. Use CSV ou OFX.");
        const entries = file.name.toLowerCase().endsWith(".ofx")
          ? parseOfx(decodeOfx(await file.arrayBuffer()))
          : parseNubankCsv(await file.text());
        if (!entries.length) throw new Error("Nenhum lançamento encontrado.");
        total += entries.length;
        if (total > 50000)
          throw new Error(
            "O lote excede 50.000 lançamentos. Divida em lotes menores.",
          );
        parsed.push({ filename: file.name, transactions: entries });
      }
      if (request === sequence.current) setFiles(parsed);
    } catch (reason) {
      if (request === sequence.current)
        setError(
          `${currentName ? currentName + ": " : ""}${reason instanceof Error ? reason.message : "Não foi possível ler os arquivos."} Nenhum arquivo do lote foi importado.`,
        );
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }
  function continueImport() {
    try {
      sessionStorage.setItem("atlas-import-preview", JSON.stringify({ files }));
      router.push("/importar/salvar");
    } catch {
      setError(
        "A prévia excedeu o espaço do navegador. Selecione menos arquivos por vez.",
      );
    }
  }
  return (
    <div className="grid gap-6">
      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void selectFiles(event.dataTransfer.files);
        }}
        className="grid cursor-pointer gap-2 rounded-2xl border border-dashed border-[var(--accent)] bg-white/70 p-8 text-center"
      >
        <span className="font-medium">Selecione os CSVs ou OFXs do Nubank</span>
        <span className="text-sm text-[var(--muted)]">
          Selecione vários arquivos ou arraste-os juntos. O lote será lido
          localmente para montar a prévia.
        </span>
        <input
          accept=".csv,.ofx,text/csv,application/x-ofx"
          className="mx-auto mt-2 max-w-full text-sm"
          type="file"
          multiple
          onChange={(event) => selectFiles(event.target.files ?? [])}
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
      {loading ? <p role="status">Lendo arquivos…</p> : null}
      {files.length ? (
        <section className="grid gap-3" aria-label="Arquivos selecionados">
          <p>
            {files.length} arquivos ·{" "}
            {files.reduce((sum, file) => sum + file.transactions.length, 0)}{" "}
            lançamentos antes da deduplicação.
          </p>
          {files.map((file, index) => (
            <div
              key={index}
              className="rounded-lg border border-[var(--line)] p-3"
            >
              <button
                type="button"
                className="text-sm font-medium underline"
                onClick={() => setSelected(index)}
                aria-pressed={selected === index}
              >
                {file.filename} · {file.transactions.length} lançamentos — Ver
                prévia
              </button>
              <ImportSummary transactions={file.transactions} />
            </div>
          ))}
        </section>
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
              onClick={() => selectFiles()}
              type="button"
            >
              Escolher outros arquivos
            </button>
          </div>
          <div className="p-5">
            <p className="font-medium">
              Detectado: {sourceLabels[transactions[0].sourceType]}
            </p>
            <ImportSummary transactions={transactions} />
          </div>
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="sticky top-0 bg-[#f7f8f5] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Descrição</th>
                  <th className="px-5 py-3">Natureza</th>
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
                    <td className="px-5 py-3">
                      {typeLabels[transaction.type]}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      {transactionSign(transaction.type)}
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
      <div className="flex flex-wrap gap-3">
        <Link
          className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-5 text-sm"
          href="/transacoes"
        >
          Cancelar
        </Link>
        <button
          className="min-h-11 rounded-lg bg-[var(--foreground)] px-5 text-sm font-medium text-white disabled:opacity-50"
          disabled={loading || !files.length}
          onClick={continueImport}
          type="button"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
