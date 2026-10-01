"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { applyNameRules } from "@/lib/name-rules";

export async function saveCategoryRule(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const contains = String(formData.get("contains") ?? "")
    .trim()
    .slice(0, 100);
  const categoryId = String(formData.get("categoryId") ?? "");
  const enabled = formData.get("enabled") === "on";
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!contains || !category) redirect("/regras?erro=regra");
  try {
    if (id)
      await prisma.categoryRule.update({
        where: { id },
        data: { contains, categoryId, enabled },
      });
    else
      await prisma.categoryRule.create({
        data: { contains, categoryId, enabled },
      });
  } catch {
    redirect("/regras?erro=duplicada");
  }
  revalidatePath("/regras");
  revalidatePath("/importar");
  redirect("/regras?sucesso=salva");
}

export async function deleteCategoryRule(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.categoryRule.delete({ where: { id } });
  revalidatePath("/regras");
  redirect("/regras?sucesso=excluida");
}

export async function saveNameRule(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const contains = String(formData.get("contains") ?? "")
    .trim()
    .slice(0, 100);
  const name = String(formData.get("name") ?? "")
    .trim()
    .slice(0, 100);
  if (!contains || !name) redirect("/regras?erro=nome");
  const existing = await prisma.nameRule.findMany({
    select: { id: true, contains: true },
  });
  if (
    existing.some(
      (rule) =>
        rule.id !== id &&
        rule.contains.toLocaleLowerCase("pt-BR") ===
          contains.toLocaleLowerCase("pt-BR"),
    )
  )
    redirect("/regras?erro=nomeDuplicado");
  try {
    await prisma.$transaction(async (tx) => {
      if (id)
        await tx.nameRule.update({ where: { id }, data: { contains, name } });
      else await tx.nameRule.create({ data: { contains, name } });
      await applyNameRules(tx);
    });
  } catch {
    redirect("/regras?erro=nome");
  }
  revalidatePath("/regras");
  revalidatePath("/transacoes");
  revalidatePath("/recorrentes");
  revalidatePath("/dashboard");
  redirect("/regras?sucesso=salva");
}

export async function deleteNameRule(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.nameRule.delete({ where: { id } });
  revalidatePath("/regras");
  redirect("/regras?sucesso=excluida");
}
