"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClearForm() {
  const router = useRouter();
  const [mode, setMode] = useState("transactions");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [protectionFile, setProtectionFile] = useState("");
  async function clear() {
    if (busy || confirmation !== "LIMPAR") return;
    const scope =
      mode === "all"
        ? "todos os dados, incluindo regras e patrimônio"
        : "todas as transações, inclusive manuais, e o histórico de importações";
    if (
      !window.confirm(
        `Excluir ${scope}? Um backup completo será salvo antes da limpeza.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setProtectionFile("");
    try {
      const response = await fetch("/api/backup/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, confirmation }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result.error ?? "Não foi possível limpar os dados.");
        return;
      }
      setProtectionFile(result.protectionFile);
      setConfirmation("");
      router.refresh();
    } catch {
      setError(
        "Não foi possível confirmar o resultado. Recarregue a tela e confira seus dados antes de tentar novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form action={clear} className="grid gap-4">
      <fieldset disabled={busy} className="grid gap-3">
        <legend className="mb-3 text-sm font-medium">
          O que deseja limpar?
        </legend>
        <label className="flex items-start gap-3 text-sm">
          <input
            className="mt-1"
            type="radio"
            name="mode"
            value="transactions"
            checked={mode === "transactions"}
            onChange={() => {
              setMode("transactions");
              setConfirmation("");
            }}
          />
          <span>
            <strong>Limpar lançamentos e importações</strong>
            <span className="mt-1 block text-[var(--muted)]">
              Remove todas as transações, inclusive manuais, e libera a
              reimportação dos CSVs. Mantém contas, categorias, regras e
              patrimônio.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            className="mt-1"
            type="radio"
            name="mode"
            value="all"
            checked={mode === "all"}
            onChange={() => {
              setMode("all");
              setConfirmation("");
            }}
          />
          <span>
            <strong>Resetar tudo</strong>
            <span className="mt-1 block text-[var(--muted)]">
              Remove também contas, categorias, regras e todo o histórico
              patrimonial. Recria somente a conta principal e as categorias
              padrão.
            </span>
          </span>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Digite LIMPAR para confirmar
          <input
            className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3"
            autoComplete="off"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>
      </fieldset>
      <button
        type="submit"
        disabled={busy || confirmation !== "LIMPAR"}
        className="min-h-11 justify-self-start rounded-lg bg-rose-800 px-5 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy
          ? "Salvando backup e limpando…"
          : mode === "all"
            ? "Resetar todos os dados"
            : "Limpar lançamentos e importações"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      {protectionFile ? (
        <div
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          Limpeza concluída. Backup anterior salvo em{" "}
          <code className="break-all">{protectionFile}</code>, relativo à pasta
          do banco. Para recuperar os dados, selecione esse JSON em Restaurar um
          backup.
        </div>
      ) : null}
    </form>
  );
}
