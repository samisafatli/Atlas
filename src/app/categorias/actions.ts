"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function refreshCategories() {
  revalidatePath("/", "layout");
}

export async function saveCategory(form: FormData) {
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const type = String(form.get("type") ?? "");
  if (!name || name.length > 100 || !["INCOME", "EXPENSE"].includes(type))
    redirect("/categorias?erro=dados");
  try {
    await prisma.$transaction(async (tx) => {
      if (id) {
        const existing = await tx.category.findUnique({ where: { id } });
        // Changing nature would invalidate transactions and category rules.
        if (!existing || existing.type !== type) throw new Error("dados");
      }
      const siblings = await tx.category.findMany({ where: { type } });
      if (
        siblings.some(
          (item) =>
            item.id !== id &&
            item.name.toLocaleLowerCase("pt-BR") ===
              name.toLocaleLowerCase("pt-BR"),
        )
      )
        throw new Error("duplicada");
      if (id) await tx.category.update({ where: { id }, data: { name } });
      else await tx.category.create({ data: { name, type } });
    });
  } catch (error) {
    redirect(
      `/categorias?erro=${error instanceof Error && error.message === "duplicada" ? "duplicada" : "dados"}`,
    );
  }
  refreshCategories();
  redirect("/categorias?sucesso=salva");
}

export async function deleteCategory(form: FormData) {
  const id = String(form.get("id") ?? "");
  if (!id || form.get("confirm") !== "on")
    redirect("/categorias?erro=confirmacao");
  // A single conditional delete protects associations even if the page is stale.
  const result = await prisma.category.deleteMany({
    where: { id, transactions: { none: {} }, rules: { none: {} } },
  });
  if (!result.count) redirect("/categorias?erro=uso");
  refreshCategories();
  redirect("/categorias?sucesso=excluida");
}
