"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function readTransaction(formData: FormData, categoryRequired = false) {
  const description = String(formData.get("description") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const amountText = String(formData.get("amount") ?? "").trim();
  const amountMatch = amountText.match(/^(\d{1,12})(?:[.,](\d{1,2}))?$/);
  const amountCents = amountMatch
    ? BigInt(amountMatch[1]) * 100n +
      BigInt((amountMatch[2] ?? "").padEnd(2, "0") || "0")
    : 0n;
  const type = String(formData.get("type") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const occurredAt = new Date(`${date}T12:00:00.000Z`);

  if (
    !description ||
    description.length > 300 ||
    !date ||
    amountCents <= 0n ||
    !Number.isFinite(occurredAt.getTime()) ||
    occurredAt.toISOString().slice(0, 10) !== date ||
    !["INCOME", "EXPENSE"].includes(type) ||
    (categoryRequired && !categoryId) ||
    !accountId
  )
    return null;
  return {
    description,
    occurredAt,
    amountCents,
    type,
    categoryId: categoryId || null,
    accountId,
  };
}

async function validReferences(
  data: NonNullable<ReturnType<typeof readTransaction>>,
) {
  const [account, category] = await Promise.all([
    prisma.account.findUnique({ where: { id: data.accountId } }),
    data.categoryId
      ? prisma.category.findUnique({ where: { id: data.categoryId } })
      : null,
  ]);
  return Boolean(
    account && (!data.categoryId || (category && category.type === data.type)),
  );
}

export async function createTransaction(formData: FormData) {
  const data = readTransaction(formData, true);
  if (!data || !(await validReferences(data)))
    redirect("/transacoes?erro=dados");
  await prisma.transaction.create({ data });
  revalidatePath("/transacoes");
  revalidatePath("/");
  redirect("/transacoes?sucesso=criada");
}

export async function updateTransaction(id: string, formData: FormData) {
  const data = readTransaction(formData);
  if (!id || !data || !(await validReferences(data)))
    redirect("/transacoes?erro=dados");
  try {
    await prisma.transaction.update({ where: { id }, data });
  } catch {
    redirect("/transacoes?erro=salvar");
  }
  revalidatePath("/transacoes");
  revalidatePath("/");
  redirect("/transacoes?sucesso=atualizada");
}

export async function deleteTransaction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/transacoes?erro=excluir");
  try {
    await prisma.transaction.delete({ where: { id } });
  } catch {
    redirect("/transacoes?erro=excluir");
  }
  revalidatePath("/transacoes");
  revalidatePath("/");
  redirect("/transacoes?sucesso=excluida");
}

export async function updateTransactionCategory(
  id: string,
  formData: FormData,
) {
  const categoryId = String(formData.get("categoryId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/transacoes");
  const safeReturnTo = returnTo.startsWith("/transacoes")
    ? returnTo
    : "/transacoes";
  const [transaction, category] = await Promise.all([
    prisma.transaction.findUnique({ where: { id }, select: { type: true } }),
    categoryId
      ? prisma.category.findUnique({ where: { id: categoryId } })
      : null,
  ]);
  if (
    !transaction ||
    (categoryId && (!category || category.type !== transaction.type))
  )
    redirect(
      `${safeReturnTo}${safeReturnTo.includes("?") ? "&" : "?"}erro=categoria`,
    );
  try {
    await prisma.transaction.update({
      where: { id },
      data: { categoryId: categoryId || null },
    });
  } catch {
    redirect(
      `${safeReturnTo}${safeReturnTo.includes("?") ? "&" : "?"}erro=categoria`,
    );
  }
  revalidatePath("/transacoes");
  const destination = new URL(safeReturnTo, "http://atlas.local");
  destination.searchParams.set("categoriaStatus", "atualizada");
  redirect(`${destination.pathname}${destination.search}`);
}
