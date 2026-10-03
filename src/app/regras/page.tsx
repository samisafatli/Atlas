import { getPrisma } from "@/lib/prisma";
import {
  deleteCategoryRule,
  deleteNameRule,
  saveCategoryRule,
  saveNameRule,
} from "./actions";
import { PageShell } from "@/app/page-shell";

export default async function CategoryRulesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const prisma = await getPrisma();
  const [categories, rules, nameRules, query] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
    prisma.categoryRule.findMany({
      include: { category: true },
      orderBy: [{ createdAt: "asc" }, { contains: "asc" }],
    }),
    prisma.nameRule.findMany({ orderBy: { name: "asc" } }),
    searchParams,
  ]);
  return (
    <PageShell width="medium">
      <h1 className="mb-7 text-3xl font-medium">Regras automáticas</h1>
      {query.erro ? (
        <p
          className="mb-5 rounded-lg bg-neg-soft p-3 text-sm text-neg"
          role="alert"
        >
          {query.erro === "duplicada"
            ? "Já existe uma regra igual para essa categoria."
            : query.erro === "nomeDuplicado"
              ? "Já existe uma regra de nome para esse termo."
              : query.erro === "nome"
                ? "Informe o termo e o nome."
                : "Informe o termo e uma categoria válida."}
        </p>
      ) : null}
      {query.sucesso ? (
        <p
          className="mb-5 rounded-lg bg-pos-soft p-3 text-sm text-pos"
          role="status"
        >
          Regra atualizada.
        </p>
      ) : null}
      <form
        action={saveCategoryRule}
        className="mb-8 grid gap-4 rounded-2xl border border-[var(--line)] bg-surface p-5 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
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
          className="min-h-11 rounded-lg bg-[var(--foreground)] hover:bg-accent px-5 text-sm font-medium text-on-accent"
          type="submit"
        >
          Criar regra
        </button>
      </form>
      <section className="grid gap-3" aria-label="Regras cadastradas">
        {rules.length ? (
          rules.map((rule) => (
            <article
              className="grid gap-3 rounded-xl border border-[var(--line)] bg-surface-2 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
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
                <button className="text-sm text-neg underline" type="submit">
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
      <h2 className="mt-12 mb-2 text-xl font-medium">Nomes</h2>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Preenchem a observação de lançamentos sem observação.
      </p>
      <form
        action={saveNameRule}
        className="mb-8 grid gap-4 rounded-2xl border border-[var(--line)] bg-surface p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <label className="grid gap-2 text-sm font-medium">
          Descrição contém
          <input
            className="min-h-11 rounded-lg border border-[var(--line)] px-3 font-normal"
            name="contains"
            required
            maxLength={100}
            placeholder="Ex.: Sua Academia"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Nome
          <input
            className="min-h-11 rounded-lg border border-[var(--line)] px-3 font-normal"
            name="name"
            required
            maxLength={100}
            placeholder="Ex.: Academia"
          />
        </label>
        <button
          className="min-h-11 rounded-lg bg-[var(--foreground)] hover:bg-accent px-5 text-sm font-medium text-on-accent"
          type="submit"
        >
          Criar regra
        </button>
      </form>
      <section className="grid gap-3" aria-label="Regras de nome cadastradas">
        {nameRules.length ? (
          nameRules.map((rule) => (
            <article
              className="grid gap-3 rounded-xl border border-[var(--line)] bg-surface-2 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
              key={rule.id}
            >
              <p className="text-sm">
                <strong>{rule.contains}</strong> → {rule.name}
              </p>
              <form
                action={saveNameRule}
                className="flex flex-wrap items-center gap-2"
              >
                <input name="id" type="hidden" value={rule.id} />
                <input
                  className="h-9 w-32 rounded border border-[var(--line)] px-2 text-sm"
                  name="contains"
                  defaultValue={rule.contains}
                  required
                />
                <input
                  className="h-9 w-40 rounded border border-[var(--line)] px-2 text-sm"
                  name="name"
                  defaultValue={rule.name}
                  required
                />
                <button
                  className="text-sm text-[var(--accent)] underline"
                  type="submit"
                >
                  Salvar
                </button>
              </form>
              <form action={deleteNameRule}>
                <input name="id" type="hidden" value={rule.id} />
                <button className="text-sm text-neg underline" type="submit">
                  Excluir
                </button>
              </form>
            </article>
          ))
        ) : (
          <p className="rounded-xl border border-[var(--line)] p-6 text-sm text-[var(--muted)]">
            Nenhuma regra de nome cadastrada.
          </p>
        )}
      </section>
    </PageShell>
  );
}
