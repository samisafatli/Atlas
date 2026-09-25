"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { transactionFingerprint } from "@/lib/transaction-fingerprint";
import { existingImportFingerprints } from "@/lib/import-deduplication";
import { matchCategoryRule, sortCategoryRules } from "@/lib/category-rules";

type PreviewRow = {
  date: string;
  description: string;
  amountCents: string;
  type: "INCOME" | "EXPENSE";
};

export async function saveNubankImport(formData: FormData) {
  const filename = String(formData.get("filename") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "");
  let rows: PreviewRow[];
  try {
    const parsed: unknown = JSON.parse(
      String(formData.get("transactions") ?? ""),
    );
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 50000)
      redirect("/importar?erro=arquivo");
    rows = parsed as PreviewRow[];
  } catch {
    redirect("/importar?erro=arquivo");
  }
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (
    !filename ||
    filename.length > 300 ||
    !account ||
    rows.some((row) => {
      const date = new Date(`${row.date}T12:00:00Z`);
      return (
        !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== row.date ||
        !row.description?.trim() ||
        row.description.length > 300 ||
        !/^[1-9]\d{0,13}$/.test(row.amountCents) ||
        !["INCOME", "EXPENSE"].includes(row.type)
      );
    })
  )
    redirect("/importar?erro=arquivo");

  let inserted = 0;
  let skipped = 0;
  try {
    const rules = sortCategoryRules(
      await prisma.categoryRule.findMany({
        where: { enabled: true },
        include: { category: true },
      }),
    );
    await prisma.$transaction(async (tx) => {
      const candidates = rows.map((row) => ({
        row,
        fingerprint: transactionFingerprint({ ...row, accountId }),
      }));
      const fingerprints = await existingImportFingerprints(
        tx,
        rows.map((row) => ({ ...row, accountId })),
      );
      const seen = new Set(fingerprints);
      const toCreate = candidates.flatMap(({ row, fingerprint }) => {
        if (seen.has(fingerprint)) {
          skipped += 1;
          return [];
        }
        seen.add(fingerprint);
        const matchedCategory = matchCategoryRule(
          row.description,
          row.type,
          rules,
        );
        return [
          {
            description: row.description.trim().slice(0, 300),
            amountCents: BigInt(row.amountCents),
            type: row.type,
            occurredAt: new Date(`${row.date}T12:00:00.000Z`),
            accountId,
            fingerprint,
            categoryId: matchedCategory?.category.id ?? null,
          },
        ];
      });
      const record = await tx.import.create({
        data: { filename, transactionCount: toCreate.length },
      });
      for (let index = 0; index < toCreate.length; index += 100) {
        const batch = toCreate.slice(index, index + 100);
        await tx.transaction.createMany({
          data: batch.map((row) => ({ ...row, importId: record.id })),
        });
      }
      inserted = toCreate.length;
    });
  } catch {
    redirect("/importar?erro=salvar");
  }
  revalidatePath("/transacoes");
  revalidatePath("/");
  redirect(
    `/transacoes?sucesso=importadas&quantidade=${inserted}&duplicadas=${skipped}`,
  );
}
