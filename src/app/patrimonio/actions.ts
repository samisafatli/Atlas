"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const assetTypes = [
  "CHECKING",
  "FIXED_INCOME",
  "STOCKS",
  "ETF",
  "CRYPTO",
  "INTERNATIONAL",
  "OTHER",
];

export async function saveAssetAccount(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const institution = String(formData.get("institution") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  if (!name || !institution || !assetTypes.includes(type))
    redirect("/patrimonio?erro=conta");
  try {
    if (id)
      await prisma.assetAccount.update({
        where: { id },
        data: { name, institution, type },
      });
    else
      await prisma.assetAccount.create({ data: { name, institution, type } });
  } catch {
    redirect("/patrimonio?erro=duplicada");
  }
  revalidatePath("/patrimonio");
  revalidatePath("/dashboard");
  redirect("/patrimonio?sucesso=conta");
}

export async function deleteAssetAccount(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  try {
    if (id) await prisma.assetAccount.delete({ where: { id } });
  } catch {
    redirect("/patrimonio?erro=historico");
  }
  revalidatePath("/patrimonio");
  redirect("/patrimonio?sucesso=excluida");
}

function parseAmount(value: string) {
  const match = value.trim().match(/^(\d{1,12})(?:[.,](\d{1,2}))?$/);
  if (!match) return null;
  return (
    BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0")
  );
}

export async function saveAssetSnapshot(id: string, formData: FormData) {
  const rawDate = String(formData.get("snapshotDate") ?? "");
  const dateMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const snapshotDate = dateMatch ? new Date(`${rawDate}T00:00:00.000Z`) : null;
  if (
    !snapshotDate ||
    !Number.isFinite(snapshotDate.getTime()) ||
    snapshotDate.toISOString().slice(0, 10) !== rawDate
  )
    redirect("/patrimonio?erro=data");
  const accounts = await prisma.assetAccount.findMany({ select: { id: true } });
  if (accounts.length === 0) redirect("/patrimonio?erro=sem-contas");
  const values = accounts.map((account) => ({
    accountId: account.id,
    amountCents: parseAmount(
      String(formData.get(`amount:${account.id}`) ?? "0"),
    ),
  }));
  if (values.some((value) => value.amountCents === null))
    redirect("/patrimonio?erro=valor");
  const totalCents = values.reduce(
    (sum, value) => sum + (value.amountCents ?? 0n),
    0n,
  );
  try {
    await prisma.$transaction(async (tx) => {
      let snapshotId = id;
      if (id) {
        await tx.assetSnapshot.update({
          where: { id },
          data: { snapshotDate, totalCents },
        });
        await tx.assetSnapshotValue.deleteMany({ where: { snapshotId: id } });
      } else {
        const snapshot = await tx.assetSnapshot.create({
          data: { snapshotDate, totalCents },
        });
        snapshotId = snapshot.id;
      }
      await tx.assetSnapshotValue.createMany({
        data: values.map((value) => ({
          snapshotId,
          accountId: value.accountId,
          amountCents: value.amountCents!,
        })),
      });
    });
  } catch {
    redirect("/patrimonio?erro=snapshot");
  }
  revalidatePath("/patrimonio");
  revalidatePath("/dashboard");
  redirect("/patrimonio?sucesso=snapshot");
}

export async function deleteAssetSnapshot(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.assetSnapshot.delete({ where: { id } });
  revalidatePath("/patrimonio");
  redirect("/patrimonio?sucesso=snapshot-excluido");
}
