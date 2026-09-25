import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-2xl">
        <p className="mb-8 text-sm font-semibold tracking-[0.2em] text-[var(--accent)] uppercase">
          Atlas
        </p>
        <div className="border-t border-[var(--line)] pt-8">
          <p className="mb-4 text-sm text-[var(--muted)]">Finanças pessoais</p>
          <h1 className="max-w-xl text-4xl leading-tight font-medium tracking-tight sm:text-6xl">
            Mais clareza para cuidar do seu dinheiro.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-[var(--muted)]">
            Este é o começo do Atlas. A base do projeto está pronta; vamos
            construir o restante passo a passo.
          </p>
          <div className="mt-12 inline-flex items-center gap-3 rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm text-[var(--muted)]">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-[var(--accent)]"
            />
            Fundação do projeto
          </div>
          <div className="mt-8">
            <Link
              className="inline-flex items-center rounded-lg bg-[var(--foreground)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent)]"
              href="/transacoes"
            >
              Ver transações{" "}
              <span aria-hidden="true" className="ml-2">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
