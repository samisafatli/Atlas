"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  transactionFingerprint,
  withImportOccurrences,
} from "@/lib/transaction-fingerprint";
import { existingImportFingerprints } from "@/lib/import-deduplication";
import { matchCategoryRule, sortCategoryRules } from "@/lib/category-rules";
import type { ImportedTransaction } from "@/lib/nubank-csv";
import { categoryType, transactionTypes } from "@/lib/transaction-types";
import { salaryCategory } from "@/lib/personal-rules";
import { matchNameRule } from "@/lib/name-rules";

type PreviewRow = ImportedTransaction;

export async function saveNubankImport(formData: FormData) {
  const filename = String(formData.get("filename") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "");
  let files: { filename: string; transactions: PreviewRow[] }[];
  try {
    const parsed = formData.has("files")
      ? JSON.parse(String(formData.get("files")))
      : [
          {
            filename,
            transactions: JSON.parse(
              String(formData.get("transactions") ?? ""),
            ),
          },
        ];
    if (
      !Array.isArray(parsed) ||
      !parsed.length ||
      parsed.length > 50 ||
      parsed.some(
        (file) =>
          !file ||
          typeof file.filename !== "string" ||
          !file.filename.trim() ||
          file.filename.length > 300 ||
          !Array.isArray(file.transactions) ||
          !file.transactions.length,
      ) ||
      parsed.reduce((sum, file) => sum + file.transactions.length, 0) > 50000
    )
      redirect("/importar?erro=arquivo");
    files = parsed;
  } catch {
    redirect("/importar?erro=arquivo");
  }
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (
    !account ||
    files.some(({ transactions: rows }) =>
      rows.some((row) => {
        if (!row || typeof row !== "object") return true;
        const date = new Date(`${row.date}T12:00:00Z`);
        return (
          !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
          !Number.isFinite(date.getTime()) ||
          date.toISOString().slice(0, 10) !== row.date ||
          typeof row.description !== "string" ||
          !row.description.trim() ||
          row.description.length > 300 ||
          !/^[1-9]\d{0,13}$/.test(row.amountCents) ||
          !transactionTypes.includes(row.type) ||
          !["BANK_STATEMENT", "CREDIT_CARD"].includes(row.sourceType) ||
          row.sourceType !== rows[0].sourceType ||
          (row.externalId !== null &&
            (typeof row.externalId !== "string" ||
              row.externalId.length > 200)) ||
          (row.sourceType === "CREDIT_CARD" && row.type === "INCOME")
        );
      }),
    )
  )
    redirect("/importar?erro=arquivo");
  const legacyImport = await prisma.import.findFirst({
    where: { sourceType: "LEGACY", transactions: { some: { accountId } } },
  });
  if (legacyImport) redirect("/importar?erro=legado");

  let inserted = 0;
  let skipped = 0;
  try {
    const rules = sortCategoryRules(
      await prisma.categoryRule.findMany({
        where: { enabled: true },
        include: { category: true },
      }),
    );
    const nameRules = await prisma.nameRule.findMany();
    await prisma.$transaction(async (tx) => {
      const importFiles = files.map((file) => ({
        ...file,
        transactions: withImportOccurrences(
          file.transactions.map((row) => ({ ...row, accountId })),
        ),
      }));
      const rows = importFiles.flatMap((file) => file.transactions);
      const salaryIds = new Map<string, string>();
      for (const name of new Set(
        rows
          .map((row) =>
            salaryCategory(row.description, row.type, row.sourceType),
          )
          .filter((name) => name !== null),
      )) {
        const category = await tx.category.upsert({
          where: { name_type: { name, type: "INCOME" } },
          create: { name, type: "INCOME" },
          update: {},
        });
        salaryIds.set(name, category.id);
      }
      const fingerprints = await existingImportFingerprints(
        tx,
        rows.map((row) => ({ ...row, accountId })),
      );
      const seen = new Set(fingerprints);
      for (const file of importFiles) {
        const toCreate = file.transactions
          .map((row) => ({
            row,
            fingerprint: transactionFingerprint({ ...row, accountId }),
          }))
          .flatMap(({ row, fingerprint }) => {
            if (seen.has(fingerprint)) {
              skipped += 1;
              return [];
            }
            seen.add(fingerprint);
            const matchedCategory = matchCategoryRule(
              row.description,
              categoryType(row.type) ?? "TRANSFER",
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
                sourceType: row.sourceType,
                externalId: row.externalId,
                note: matchNameRule(row.description, nameRules),
                categoryId:
                  salaryIds.get(
                    salaryCategory(row.description, row.type, row.sourceType) ??
                      "",
                  ) ??
                  matchedCategory?.category.id ??
                  null,
              },
            ];
          });
        const record = await tx.import.create({
          data: {
            filename: file.filename,
            transactionCount: toCreate.length,
            sourceType: file.transactions[0].sourceType,
            parserVersion: 2,
          },
        });
        for (let index = 0; index < toCreate.length; index += 100) {
          const batch = toCreate.slice(index, index + 100);
          await tx.transaction.createMany({
            data: batch.map((row) => ({ ...row, importId: record.id })),
          });
        }
        inserted += toCreate.length;
      }
    });
  } catch {
    redirect("/importar?erro=salvar");
  }
  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
  revalidatePath("/recorrentes");
  revalidatePath("/importar/historico");
  revalidatePath("/");
  redirect(
    `/transacoes?sucesso=importadas&quantidade=${inserted}&duplicadas=${skipped}`,
  );
}
