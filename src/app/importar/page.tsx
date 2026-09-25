import Link from "next/link";
import { ImportPreview } from "./preview";

export const metadata = {
  title: "Importar CSV — Atlas",
  description: "Confira transações de um CSV do Nubank antes de importar.",
};

export default function ImportPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-10 flex justify-between">
        <Link
          className="text-sm font-semibold tracking-[0.2em] text-[var(--accent)] uppercase"
          href="/"
        >
          Atlas
        </Link>
        <Link className="text-sm text-[var(--muted)]" href="/transacoes">
          ← Transações
        </Link>
      </header>
      <section>
        <p className="mb-3 text-sm text-[var(--muted)]">Importação de dados</p>
        <h1 className="mb-3 text-3xl font-medium">Prévia do CSV do Nubank</h1>
        <p className="mb-8 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Confira as datas, descrições e valores encontrados. A leitura do
          arquivo não altera seus dados.
        </p>
        <ImportPreview />
      </section>
    </main>
  );
}
