import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteCategoryRule, saveCategoryRule } from "./actions";

export const metadata = { title: "Regras de categoria — Atlas" };

export default async function CategoryRulesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const [categories, rules, query] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
    prisma.categoryRule.findMany({
      include: { category: true },
      orderBy: [{ createdAt: "asc" }, { contains: "asc" }],
    }),
    searchParams,
  ]);
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
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
      <h1 className="mb-3 text-3xl font-medium">Regras automáticas</h1>
      <p className="mb-7 text-sm leading-6 text-[var(--muted)]">
        Regras determinísticas são aplicadas somente durante novas importações.
        A regra com o termo mais longo vence; empates usam a regra criada
        primeiro. Transações existentes não são alteradas.
      </p>
      {query.erro ? (
        <p
          className="mb-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
          role="alert"
        >
          {query.erro === "duplicada"
            ? "Já existe uma regra igual para essa categoria."
            : "Informe o termo e uma categoria válida."}
        </p>
      ) : null}
      {query.sucesso ? (
        <p
          className="mb-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
          role="status"
        >
          Regra atualizada.
        </p>
      ) : null}
      <form
        action={saveCategoryRule}
        className="mb-8 grid gap-4 rounded-2xl border border-[var(--line)] bg-white/80 p-5 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
      >
        <label className="grid gap-2 text-sm font-medium">
          Descrição contém
          <input
            className="min-h-11 rounded-lg border border-[var(--line)] px-3 font-normal"
            name="contains"
            required
            maxLength={100}
            placeholder="Ex.: IFOOD"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Categoria
          <select
            className="min-h-11 rounded-lg border border-[var(--line)] px-3 font-normal"
            name="categoryId"
            required
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ·{" "}
                {category.type === "INCOME" ? "Receita" : "Despesa"}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input defaultChecked name="enabled" type="checkbox" />
          Ativa
        </label>
        <button
          className="min-h-11 rounded-lg bg-[var(--foreground)] px-5 text-sm font-medium text-white"
          type="submit"
        >
          Criar regra
        </button>
      </form>
      <section className="grid gap-3" aria-label="Regras cadastradas">
        {rules.length ? (
          rules.map((rule) => (
            <article
              className="grid gap-3 rounded-xl border border-[var(--line)] bg-white/70 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
              key={rule.id}
            >
              <p className="text-sm">
                <strong>{rule.contains}</strong> → {rule.category.name}
                <span className="ml-2 text-xs text-[var(--muted)]">
                  {rule.enabled ? "Ativa" : "Desativada"}
                </span>
              </p>
              <form
                action={saveCategoryRule}
                className="flex flex-wrap items-center gap-2"
              >
                <input name="id" type="hidden" value={rule.id} />
                <input
                  className="h-9 w-32 rounded border border-[var(--line)] px-2 text-sm"
                  name="contains"
                  defaultValue={rule.contains}
                  required
                />
                <select
                  className="h-9 rounded border border-[var(--line)] px-2 text-sm"
                  name="categoryId"
                  defaultValue={rule.categoryId}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    defaultChecked={rule.enabled}
                    name="enabled"
                    type="checkbox"
                  />
                  Ativa
                </label>
                <button
                  className="text-sm text-[var(--accent)] underline"
                  type="submit"
                >
                  Salvar
                </button>
              </form>
              <form action={deleteCategoryRule}>
                <input name="id" type="hidden" value={rule.id} />
                <button
                  className="text-sm text-rose-700 underline"
                  type="submit"
                >
                  Excluir
                </button>
              </form>
            </article>
          ))
        ) : (
          <p className="rounded-xl border border-[var(--line)] p-6 text-sm text-[var(--muted)]">
            Nenhuma regra cadastrada. Exemplo: IFOOD → Alimentação.
          </p>
        )}
      </section>
    </main>
  );
}
