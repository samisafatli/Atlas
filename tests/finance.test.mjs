import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import Database from "better-sqlite3";

// Run real application actions against an isolated SQLite database. Only the
// Next request context (redirect/cache) is replaced; persistence is not mocked.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only" || specifier === "next/cache")
      return {
        url: "data:text/javascript,export function revalidatePath() {}",
        shortCircuit: true,
      };
    if (specifier === "next/navigation")
      return {
        url: "data:text/javascript,export function redirect(url) { const error = new Error('redirect'); error.destination = url; throw error; }",
        shortCircuit: true,
      };
    if (specifier.startsWith("@/"))
      return nextResolve(
        new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier))
      return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
});

const directory = await mkdtemp(join(tmpdir(), "atlas-finance-test-"));
process.env.DATABASE_URL = `file:${join(directory, "finance.db").replaceAll("\\", "/")}`;
const database = new Database(join(directory, "finance.db"));
database.pragma("foreign_keys = ON");
const migrationRoot = new URL("../prisma/migrations/", import.meta.url);
for (const entry of (await readdir(migrationRoot, { withFileTypes: true }))
  .filter((item) => item.isDirectory())
  .sort((a, b) => a.name.localeCompare(b.name)))
  database.exec(
    await readFile(
      new URL(`${entry.name}/migration.sql`, migrationRoot),
      "utf8",
    ),
  );
database.close();

const { prisma } = await import("../src/lib/prisma-client.ts");
const transactions = await import("../src/app/transacoes/actions.ts");
const { saveNubankImport } = await import("../src/app/importar/actions.ts");
const { countImportDuplicates } =
  await import("../src/app/importar/duplicate-count.ts");
const { parseNubankCsv } = await import("../src/lib/nubank-csv.ts");
const { legacyTransactionFingerprint } =
  await import("../src/lib/transaction-fingerprint.ts");
const assets = await import("../src/app/patrimonio/actions.ts");
const { saveCategoryRule } = await import("../src/app/regras/actions.ts");
const { detectRecurringExpenses } =
  await import("../src/app/recorrentes/recurrence.ts");
const backup = await import("../src/lib/backup.ts");
const { GET } = await import("../src/app/api/backup/route.ts");
const { POST } = await import("../src/app/api/backup/restore/route.ts");
after(async () => {
  await prisma.$disconnect();
});

const form = (fields) => {
  const result = new FormData();
  for (const [key, value] of Object.entries(fields))
    result.set(key, String(value));
  return result;
};
async function redirected(action, expected) {
  await assert.rejects(
    action,
    (error) =>
      typeof error.destination === "string" &&
      error.destination.includes(expected),
  );
}

test("financial flows preserve data and reject invalid operations", async (t) => {
  const account = await prisma.account.create({
    data: { name: "Conta teste", type: "CHECKING" },
  });
  const expense = await prisma.category.create({
    data: { name: "Mercado", type: "EXPENSE" },
  });
  const other = await prisma.category.create({
    data: { name: "Outros", type: "EXPENSE" },
  });
  const income = await prisma.category.create({
    data: { name: "Receita", type: "INCOME" },
  });

  await t.test(
    "manual create, update, category change and delete",
    async () => {
      const fields = {
        description: "Manual",
        date: "2026-09-01",
        amount: "12.34",
        type: "EXPENSE",
        categoryId: expense.id,
        accountId: account.id,
      };
      await redirected(
        () => transactions.createTransaction(form(fields)),
        "sucesso=criada",
      );
      const created = await prisma.transaction.findFirstOrThrow({
        where: { description: "Manual" },
      });
      assert.equal(created.amountCents, 1234n);
      await redirected(
        () =>
          transactions.updateTransaction(
            created.id,
            form({ ...fields, amount: "25,67" }),
          ),
        "sucesso=atualizada",
      );
      assert.equal(
        (
          await prisma.transaction.findUniqueOrThrow({
            where: { id: created.id },
          })
        ).amountCents,
        2567n,
      );
      await redirected(
        () =>
          transactions.updateTransactionCategory(
            created.id,
            form({
              categoryId: other.id,
              returnTo: "/transacoes?month=2026-09",
            }),
          ),
        "month=2026-09&categoriaStatus=atualizada",
      );
      assert.equal(
        (
          await prisma.transaction.findUniqueOrThrow({
            where: { id: created.id },
          })
        ).categoryId,
        other.id,
      );
      await redirected(
        () =>
          transactions.createTransaction(
            form({ ...fields, date: "2026-02-30" }),
          ),
        "erro=dados",
      );
      await redirected(
        () =>
          transactions.createTransaction(
            form({ ...fields, categoryId: income.id }),
          ),
        "erro=dados",
      );
      await redirected(
        () => transactions.deleteTransaction(form({ id: created.id })),
        "sucesso=excluida",
      );
      assert.equal(await prisma.transaction.count(), 0);
    },
  );

  const csvRows = parseNubankCsv(
    "Data,Valor,Descrição\n01/09/2026,-10.00,Mercado\n01/09/2026,10.00,Mercado\n",
  );
  await t.test(
    "import rules, opposite types, repeated file and legacy hashes",
    async () => {
      await redirected(
        () =>
          saveCategoryRule(
            form({
              contains: "Mercado",
              categoryId: expense.id,
              enabled: "on",
            }),
          ),
        "sucesso=salva",
      );
      assert.equal(csvRows.length, 2);
      assert.equal(
        (await countImportDuplicates(csvRows, account.id)).newCount,
        2,
      );
      const fields = {
        filename: "teste.csv",
        accountId: account.id,
        transactions: JSON.stringify(csvRows),
      };
      await redirected(
        () => saveNubankImport(form(fields)),
        "quantidade=2&duplicadas=0",
      );
      assert.equal(
        await prisma.transaction.count({ where: { categoryId: expense.id } }),
        1,
      );
      assert.equal(
        (await countImportDuplicates(csvRows, account.id)).existing,
        2,
      );
      await redirected(
        () => saveNubankImport(form(fields)),
        "quantidade=0&duplicadas=2",
      );
      assert.equal(await prisma.transaction.count(), 2);
      const legacy = {
        ...csvRows[0],
        description: "Legado",
        accountId: account.id,
      };
      await prisma.transaction.create({
        data: {
          description: legacy.description,
          amountCents: BigInt(legacy.amountCents),
          type: legacy.type,
          occurredAt: new Date(`${legacy.date}T12:00:00Z`),
          accountId: account.id,
          fingerprint: legacyTransactionFingerprint(legacy),
        },
      });
      const opposite = { ...legacy, type: "INCOME" };
      const counts = await countImportDuplicates(
        [legacy, opposite, opposite],
        account.id,
      );
      assert.equal(counts.existing, 2);
      assert.equal(counts.newCount, 1);
      await redirected(
        () =>
          saveNubankImport(
            form({
              ...fields,
              transactions: JSON.stringify([legacy, opposite]),
            }),
          ),
        "quantidade=1&duplicadas=1",
      );
      assert.equal(
        (await countImportDuplicates([legacy, opposite], account.id)).existing,
        2,
      );
    },
  );

  await t.test(
    "invalid import leaves no partial history or transactions",
    async () => {
      const before = [
        await prisma.import.count(),
        await prisma.transaction.count(),
      ];
      await redirected(
        () =>
          saveNubankImport(
            form({
              filename: "invalido.csv",
              accountId: account.id,
              transactions: JSON.stringify([
                ...csvRows,
                { ...csvRows[0], date: "2026-02-30" },
              ]),
            }),
          ),
        "erro=arquivo",
      );
      assert.deepEqual(
        [await prisma.import.count(), await prisma.transaction.count()],
        before,
      );
    },
  );

  await t.test(
    "asset CRUD and snapshots preserve history until explicit edits",
    async () => {
      await redirected(
        () =>
          assets.saveAssetAccount(
            form({
              name: "Reserva",
              institution: "Banco",
              type: "FIXED_INCOME",
            }),
          ),
        "sucesso=conta",
      );
      const asset = await prisma.assetAccount.findFirstOrThrow();
      await redirected(
        () =>
          assets.saveAssetSnapshot(
            "",
            form({
              snapshotDate: "2026-08-31",
              [`amount:${asset.id}`]: "100.01",
            }),
          ),
        "sucesso=snapshot",
      );
      const first = await prisma.assetSnapshot.findFirstOrThrow();
      await redirected(
        () =>
          assets.saveAssetSnapshot(
            "",
            form({
              snapshotDate: "2026-09-30",
              [`amount:${asset.id}`]: "200.02",
            }),
          ),
        "sucesso=snapshot",
      );
      assert.equal(
        (
          await prisma.assetSnapshot.findUniqueOrThrow({
            where: { id: first.id },
          })
        ).totalCents,
        10001n,
      );
      await redirected(
        () => assets.deleteAssetAccount(form({ id: asset.id })),
        "erro=historico",
      );
      await redirected(
        () =>
          assets.saveAssetSnapshot(
            first.id,
            form({
              snapshotDate: "2026-08-31",
              [`amount:${asset.id}`]: "150.03",
            }),
          ),
        "sucesso=snapshot",
      );
      assert.equal(
        (
          await prisma.assetSnapshot.findUniqueOrThrow({
            where: { id: first.id },
          })
        ).totalCents,
        15003n,
      );
    },
  );

  await t.test(
    "recurrence explains at least three compatible monthly expenses",
    () => {
      const rows = ["2026-06-10", "2026-07-10", "2026-08-10"].map(
        (day, index) => ({
          id: String(index),
          description: "Internet",
          occurredAt: new Date(day),
          amountCents: 9990n,
          accountId: account.id,
          accountName: account.name,
          categoryId: null,
          categoryName: null,
        }),
      );
      assert.equal(detectRecurringExpenses(rows.slice(0, 2)).length, 0);
      const detected = detectRecurringExpenses(rows)[0];
      assert.equal(detected.monthlyEstimate, 9990n);
      assert.deepEqual(
        detected.transactions.map((row) => row.id),
        ["0", "1", "2"],
      );
    },
  );

  await t.test(
    "complete backup round trip, confirmation and protection copy",
    async () => {
      const response = await GET();
      assert.equal(response.status, 200);
      assert.match(
        response.headers.get("content-disposition"),
        /atlas-backup-\d{4}-\d{2}-\d{2}\.json/,
      );
      const contents = await response.text();
      const original = JSON.parse(contents);
      assert.ok(original.data.imports.length > 0);
      assert.ok(backup.parseBackup(contents));
      assert.equal(
        backup.parseBackup(JSON.stringify({ ...original, version: 999 })),
        null,
      );
      const broken = structuredClone(original);
      broken.data.transactions[0].accountId = "missing";
      assert.equal(backup.parseBackup(JSON.stringify(broken)), null);
      const makeRequest = (confirmed) => {
        const body = new FormData();
        body.set(
          "file",
          new File([contents], "atlas.json", { type: "application/json" }),
        );
        if (confirmed) body.set("confirmRestore", "yes");
        return new Request("http://localhost/api/backup/restore", {
          method: "POST",
          body,
        });
      };
      assert.equal((await POST(makeRequest(false))).status, 400);
      await prisma.account.create({
        data: { name: "Depois do backup", type: "CHECKING" },
      });
      const restored = await POST(makeRequest(true));
      assert.equal(restored.status, 200);
      const result = await restored.json();
      assert.equal(result.ok, true);
      const protection = JSON.parse(
        await readFile(join(directory, result.protectionFile), "utf8"),
      );
      assert.ok(
        protection.data.accounts.some((row) => row.name === "Depois do backup"),
      );
      const current = JSON.parse(
        backup.backupJson(await backup.createBackupObject()),
      );
      assert.deepEqual(current.data, original.data);
    },
  );
  console.info(
    `Isolated test database: ${pathToFileURL(join(directory, "finance.db")).href}`,
  );
});
