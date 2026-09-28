import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteCategory, saveCategory } from "./actions";
import { PageShell } from "@/app/page-shell";

const inputClass =
  "min-h-11 rounded-lg border border-[var(--line)] bg-white px-3";
const buttonClass =
  "min-h-11 rounded-lg bg-[var(--foreground)] px-4 text-sm text-white";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const [query, categories] = await Promise.all([
    searchParams,
    prisma.category.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: { _count: { select: { transactions: true, rules: true } } },
    }),
  ]);
  const errors: Record<string, string> = {
    dados:
      "Informe um nome de até 100 caracteres e um tipo válido. O tipo de uma categoria existente não pode ser alterado.",
    duplicada: "Já existe uma categoria com esse nome e tipo.",
    confirmacao: "Marque a confirmação para excluir a categoria.",
    uso: "Categoria em uso ou não encontrada. Reclassifique seus lançamentos e ajuste suas regras antes de excluir.",
  };
  return (
    <PageShell width="medium">
      <h1 className="mb-3 text-3xl font-medium">Categorias</h1>

      {query.erro ? (
        <p
          role="alert"
          className="mb-5 rounded-lg bg-rose-50 p-3 text-rose-800"
        >
          {errors[query.erro] ?? errors.dados}
        </p>
      ) : null}
      {query.sucesso ? (
        <p
          role="status"
          className="mb-5 rounded-lg bg-emerald-50 p-3 text-emerald-800"
        >
          {query.sucesso === "excluida"
            ? "Categoria excluída."
            : "Categoria salva."}
        </p>
      ) : null}
      <section className="mb-8 rounded-2xl border border-[var(--line)] bg-white/80 p-5">
        <h2 className="mb-4 font-medium">Nova categoria</h2>
        <form
          action={saveCategory}
          className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
        >
          <label className="grid gap-2 text-sm">
            Nome
            <input
              name="name"
              required
              maxLength={100}
              className={inputClass}
              placeholder="Ex.: Reformas e manutenção"
            />
          </label>
          <label className="grid gap-2 text-sm">
            Tipo
            <select name="type" className={inputClass} defaultValue="EXPENSE">
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
            </select>
          </label>
          <button className={buttonClass}>Criar categoria</button>
        </form>
      </section>
      <h2 className="mb-4 font-medium">Categorias existentes</h2>
      <p className="mb-4 text-sm text-[var(--muted)]">
        Só é possível excluir categorias sem lançamentos nem regras. Para
        liberar uma categoria, ajuste os{" "}
        <Link href="/transacoes" className="underline">
          lançamentos
        </Link>{" "}
        e as{" "}
        <Link href="/regras" className="underline">
          regras
        </Link>{" "}
        associados.
      </p>
      <div className="grid gap-4">
        {categories.map((category) => {
          const used =
            category._count.transactions > 0 || category._count.rules > 0;
          return (
            <section
              key={category.id}
              className="rounded-2xl border border-[var(--line)] bg-white/80 p-5"
            >
              <form
                action={saveCategory}
                className="flex flex-wrap items-end gap-3"
              >
                <input type="hidden" name="id" value={category.id} />
                <input type="hidden" name="type" value={category.type} />
                <label className="grid flex-1 gap-2 text-sm">
                  {category.type === "INCOME" ? "Receita" : "Despesa"}
                  <input
                    aria-label={`Nome da categoria ${category.name}`}
                    name="name"
                    defaultValue={category.name}
                    key={category.name}
                    required
                    maxLength={100}
                    className={inputClass}
                  />
                </label>
                <button className={buttonClass}>Salvar nome</button>
              </form>
              <p className="mt-3 text-sm text-[var(--muted)]">
                {category._count.transactions} lançamentos ·{" "}
                {category._count.rules} regras
              </p>
              {!used ? (
                <form
                  action={deleteCategory}
                  className="mt-3 flex flex-wrap items-center gap-4 text-sm"
                >
                  <input type="hidden" name="id" value={category.id} />
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="confirm" required />
                    Confirmar exclusão de {category.name}
                  </label>
                  <button className="min-h-11 px-3 text-rose-700">
                    Excluir
                  </button>
                </form>
              ) : null}
            </section>
          );
        })}
        {!categories.length ? (
          <p className="text-sm text-[var(--muted)]">
            Crie sua primeira categoria acima.
          </p>
        ) : null}
      </div>
    </PageShell>
  );
}
