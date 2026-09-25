"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

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
