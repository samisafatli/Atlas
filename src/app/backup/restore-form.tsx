"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RestoreForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [protectionFile, setProtectionFile] = useState("");

  async function restore(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".json")) {
      setError("Selecione um arquivo JSON exportado pelo Atlas.");
      return;
    }
    if (
      !window.confirm(
        "A restauração substituirá os dados atuais. O Atlas criará um backup de proteção antes de continuar. Deseja restaurar este arquivo?",
      )
    )
      return;
    setBusy(true);
    setError("");
    setProtectionFile("");
    try {
      formData.set("confirmRestore", "yes");
      const response = await fetch("/api/backup/restore", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        protectionFile?: string;
      };
      if (!response.ok || !result.ok) {
        setError(result.error ?? "Não foi possível restaurar o backup.");
        return;
      }
      setProtectionFile(result.protectionFile ?? "");
      router.refresh();
    } catch {
      setError("Não foi possível falar com o Atlas. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      action={restore}
      className="grid gap-4 rounded-2xl border border-[var(--line)] bg-white/80 p-5"
    >
      <label className="grid gap-2 text-sm font-medium">
        Arquivo do Atlas
        <input
          accept=".json,application/json"
          className="max-w-full text-sm"
          name="file"
          required
          type="file"
        />
      </label>
      <button
        className="min-h-11 justify-self-start rounded-lg bg-rose-800 px-5 text-sm font-medium text-white disabled:opacity-50"
        disabled={busy}
        type="submit"
      >
        {busy ? "Restaurando…" : "Validar e restaurar backup"}
      </button>
      {error ? (
        <p
          className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {protectionFile ? (
        <div
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
          role="status"
        >
          <p>
            Backup restaurado. Recarregue as telas para ver os dados
            atualizados.
          </p>
          <p className="mt-1">
            Cópia de proteção dos dados anteriores salva em{" "}
            <code>{protectionFile}</code>, relativa à pasta do banco SQLite.
          </p>
          <button
            className="mt-3 underline"
            onClick={() => router.refresh()}
            type="button"
          >
            Recarregar a tela
          </button>
        </div>
      ) : null}
    </form>
  );
}
