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
const { repairImport } = await import("../src/lib/repair-import.ts");
const { resultAmount, expenseAmount } =
  await import("../src/lib/transaction-types.ts");
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
      assert.equal(counts.existing, 1);
      assert.equal(counts.newCount, 2);
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
    "card and bank formats keep debits visible without counting bill payments twice",
    async () => {
      const isolated = await prisma.account.create({
        data: { name: "Cartão e conta teste", type: "CHECKING" },
      });
      const cardCsv =
        'date,title,amount\n2026-09-01,Compra teste,"100,00"\n2026-09-02,Ajuste a crédito,"- 10,00"\n2026-09-03,Pagamento recebido,"- 90,00"\n';
      const card = parseNubankCsv(cardCsv);
      assert.deepEqual(
        card.map((row) => row.type),
        ["EXPENSE", "REFUND", "TRANSFER"],
      );
      const bank = parseNubankCsv(
        'Data,Valor,Identificador,Descrição\n01/09/2026,"1000,00",bank-1,Salário\n02/09/2026,"-20,00",bank-2,Compra no débito\n03/09/2026,"-90,00",bank-3,Pagamento de fatura\n',
      );
      assert.equal(bank[1].description, "Compra no débito");
      assert.equal(bank[1].externalId, "bank-2");
      assert.deepEqual(
        bank.map((row) => row.type),
        ["INCOME", "EXPENSE", "TRANSFER"],
      );
      for (const [name, rows] of [
        ["card.csv", card],
        ["bank.csv", bank],
      ]) {
        await redirected(
          () =>
            saveNubankImport(
              form({
                filename: name,
                accountId: isolated.id,
                transactions: JSON.stringify(rows),
              }),
            ),
          "quantidade=3&duplicadas=0",
        );
        await redirected(
          () =>
            saveNubankImport(
              form({
                filename: name,
                accountId: isolated.id,
                transactions: JSON.stringify(rows),
              }),
            ),
          "quantidade=0&duplicadas=3",
        );
      }
      const saved = await prisma.transaction.findMany({
        where: { accountId: isolated.id },
      });
      assert.equal(
        saved.reduce(
          (sum, row) => sum + resultAmount(row.type, row.amountCents),
          0n,
        ),
        89000n,
      );
      assert.equal(
        saved.reduce(
          (sum, row) => sum + expenseAmount(row.type, row.amountCents),
          0n,
        ),
        11000n,
      );
      // Equal descriptions/dates/amounts across sources are independent purchases.
      const coincident = parseNubankCsv(
        'Data,Valor,Identificador,Descrição\n01/09/2026,"-100,00",bank-4,Compra teste\n01/09/2026,"-100,00",bank-5,Compra teste\n',
      );
      assert.equal(
        (await countImportDuplicates(coincident, isolated.id)).newCount,
        2,
      );
      assert.throws(
        () =>
          parseNubankCsv(
            "date,title,amount\n2026-09-01,Valid,10\n2026-02-30,Broken,10",
          ),
        /Linha 3/,
      );
      assert.throws(
        () => parseNubankCsv('date,title,amount\n2026-09-01,"Unclosed,10'),
        /aspas/,
      );
      assert.throws(
        () =>
          parseNubankCsv("date,description,amount\n2026-09-01,Ambiguous,10"),
        /Formato desconhecido/,
      );
    },
  );

  await t.test(
    "legacy repair is atomic, preserves IDs and rejects edited rows",
    async () => {
      const isolated = await prisma.account.create({
        data: { name: "Reparo teste", type: "CHECKING" },
      });
      const csv =
        "date,title,amount\n2026-09-01,Compra reparo,100\n2026-09-02,Ajuste a crédito,-10\n2026-09-03,Pagamento recebido,-90";
      const rows = parseNubankCsv(csv);
      const old = await prisma.import.create({
        data: { filename: "legacy.csv", transactionCount: rows.length },
      });
      for (const row of rows)
        await prisma.transaction.create({
          data: {
            description: row.description,
            amountCents: BigInt(row.amountCents),
            occurredAt: new Date(`${row.date}T12:00:00Z`),
            type: row.type === "EXPENSE" ? "INCOME" : "EXPENSE",
            accountId: isolated.id,
            importId: old.id,
            sourceType: "LEGACY",
            fingerprint: legacyTransactionFingerprint({
              ...row,
              accountId: isolated.id,
            }),
          },
        });
      const before = await prisma.transaction.findMany({
        where: { importId: old.id },
        orderBy: { id: "asc" },
      });
      await assert.rejects(
        () =>
          repairImport(
            prisma,
            old.id,
            csv.replace("Compra reparo", "Compra modificada"),
          ),
        /alterado ou ambíguo/,
      );
      assert.deepEqual(
        await prisma.transaction.findMany({
          where: { importId: old.id },
          orderBy: { id: "asc" },
        }),
        before,
      );
      assert.equal((await repairImport(prisma, old.id, csv)).repaired, 3);
      assert.deepEqual(
        (
          await prisma.transaction.findMany({
            where: { importId: old.id },
            orderBy: { id: "asc" },
          })
        ).map((row) => row.id),
        before.map((row) => row.id),
      );
      assert.equal(
        (await repairImport(prisma, old.id, csv)).alreadyCurrent,
        true,
      );
      assert.equal(
        (await countImportDuplicates(rows, isolated.id)).existing,
        3,
      );
      assert.equal(
        (await prisma.import.findUniqueOrThrow({ where: { id: old.id } }))
          .sourceType,
        "CREDIT_CARD",
      );
      // Manual reclassification must not make an imported bank row reappear.
      const bank = await prisma.transaction.findFirstOrThrow({
        where: { externalId: "bank-2" },
      });
      await redirected(
        () =>
          transactions.updateTransaction(
            bank.id,
            form({
              description: bank.description,
              date: "2026-09-02",
              amount: "20.00",
              type: "TRANSFER",
              accountId: bank.accountId,
              categoryId: "",
            }),
          ),
        "sucesso=atualizada",
      );
      const source = parseNubankCsv(
        'Data,Valor,Identificador,Descrição\n02/09/2026,"-20,00",bank-2,Compra no débito',
      );
      assert.equal(
        (await countImportDuplicates(source, bank.accountId)).existing,
        1,
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
      const legacyDocument = structuredClone(original);
      legacyDocument.version = 1;
      for (const row of legacyDocument.data.imports) {
        delete row.sourceType;
        delete row.parserVersion;
      }
      for (const row of legacyDocument.data.transactions) {
        delete row.sourceType;
        delete row.externalId;
      }
      const parsedLegacy = backup.parseBackup(JSON.stringify(legacyDocument));
      assert.ok(parsedLegacy);
      assert.ok(
        parsedLegacy.data.imports.every(
          (row) => row.sourceType === "LEGACY" && row.parserVersion === 1,
        ),
      );
      assert.ok(
        parsedLegacy.data.transactions.every((row) => row.externalId === null),
      );
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
  await t.test(
    "clear modes require confirmation, preserve protection backups and restore data",
    async () => {
      const { POST: clearPost } =
        await import("../src/app/api/backup/clear/route.ts");
      const before = JSON.parse(
        backup.backupJson(await backup.createBackupObject()),
      );
      const request = (mode, confirmation, origin = "http://localhost") =>
        new Request("http://localhost/api/backup/clear", {
          method: "POST",
          headers: { "content-type": "application/json", origin },
          body: JSON.stringify({ mode, confirmation }),
        });
      assert.equal((await clearPost(request("all", ""))).status, 400);
      assert.equal((await clearPost(request("invalid", "LIMPAR"))).status, 400);
      assert.equal(
        (await clearPost(request("all", "LIMPAR", "http://other.test"))).status,
        403,
      );
      assert.deepEqual(
        JSON.parse(backup.backupJson(await backup.createBackupObject())).data,
        before.data,
      );

      // A file cannot be the parent directory of the backup folder.
      const originalUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = `${originalUrl}/blocked.db`;
      try {
        assert.equal((await clearPost(request("all", "LIMPAR"))).status, 500);
      } finally {
        process.env.DATABASE_URL = originalUrl;
      }
      assert.deepEqual(
        JSON.parse(backup.backupJson(await backup.createBackupObject())).data,
        before.data,
      );

      const response = await clearPost(request("transactions", "LIMPAR"));
      assert.equal(response.status, 200);
      const { protectionFile } = await response.json();
      const protectedDocument = backup.parseBackup(
        await readFile(join(directory, protectionFile), "utf8"),
      );
      assert.ok(protectedDocument);
      assert.deepEqual(protectedDocument.data, before.data);
      const partial = JSON.parse(
        backup.backupJson(await backup.createBackupObject()),
      );
      assert.deepEqual(partial.data, {
        ...before.data,
        transactions: [],
        imports: [],
      });
      await backup.restoreBackup(protectedDocument);
      assert.deepEqual(
        JSON.parse(backup.backupJson(await backup.createBackupObject())).data,
        before.data,
      );

      const fullResponse = await clearPost(request("all", "LIMPAR"));
      assert.equal(fullResponse.status, 200);
      const full = JSON.parse(
        backup.backupJson(await backup.createBackupObject()),
      );
      for (const key of [
        "transactions",
        "imports",
        "categoryRules",
        "assetAccounts",
        "assetSnapshots",
        "assetSnapshotValues",
      ])
        assert.equal(full.data[key].length, 0);
      assert.equal(full.data.accounts.length, 1);
      assert.equal(full.data.accounts[0].name, "Conta principal");
      const { categorySeeds } = await import("../src/lib/default-data.ts");
      assert.deepEqual(
        full.data.categories
          .map(({ name, type }) => ({ name, type }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        [...categorySeeds].sort((a, b) => a.name.localeCompare(b.name)),
      );
      const fullProtection = backup.parseBackup(
        await readFile(
          join(directory, (await fullResponse.json()).protectionFile),
          "utf8",
        ),
      );
      await backup.restoreBackup(fullProtection);
      assert.deepEqual(
        JSON.parse(backup.backupJson(await backup.createBackupObject())).data,
        before.data,
      );
    },
  );
  await t.test(
    "OFX supports XML and SGML, rejects invalid files and deduplicates with CSV",
    async () => {
      const { parseOfx, decodeOfx } = await import("../src/lib/ofx.ts");
      const make = (xml = false) => {
        const tag = (key, value) =>
          `<${key}>${value}${xml ? `</${key}>` : "\n"}`;
        const row = (id, amount, description) =>
          `<STMTTRN>${tag("DTPOSTED", "20260501233000[-3:BRT]")}${tag("TRNAMT", amount)}${tag("FITID", id)}${tag("MEMO", description)}</STMTTRN>`;
        return `<OFX><STMTRS>${tag("CURDEF", "BRL")}<BANKTRANLIST>${row("ofx-income", "1200.00", "Receita")}${row("ofx-expense", "-10.25", "Mercado &amp; Cia")}${row("ofx-payment", "-200", "Pagamento de fatura")}</BANKTRANLIST></STMTRS></OFX>`;
      };
      const rows = parseOfx(make());
      assert.deepEqual(parseOfx(make(true)), rows);
      assert.deepEqual(
        rows.map((r) => r.type),
        ["INCOME", "EXPENSE", "TRANSFER"],
      );
      assert.equal(rows[1].description, "Mercado & Cia");
      assert.equal(rows[1].amountCents, "1025");
      assert.equal(rows[0].date, "2026-05-01");
      const encoded = new TextEncoder().encode(make());
      assert.deepEqual(parseOfx(decodeOfx(encoded.buffer)), rows);
      const legacyBytes = Uint8Array.from(
        Buffer.from("CHARSET:1252\n<MEMO>Saúde", "latin1"),
      );
      assert.match(decodeOfx(legacyBytes.buffer), /Saúde/);
      for (const invalid of [
        make().replace("BRL", "USD"),
        make().replace("20260501", "20260230"),
        make().replace("-10.25", "-10.251"),
        make().replace("ofx-expense", "ofx-income"),
        make().replace("</STMTTRN>", ""),
        make().replace("</OFX>", ""),
        make().replace("<FITID>ofx-income", "<FITID>"),
        "<!DOCTYPE OFX>" + make(),
        make().replace("<STMTRS>", "<STMTRS><CORRECTFITID>x</CORRECTFITID>"),
      ])
        assert.throws(() => parseOfx(invalid));
      const ofxAccount = await prisma.account.create({
        data: { name: "OFX test", type: "CHECKING" },
      });
      const fields = {
        accountId: ofxAccount.id,
        filename: "test.ofx",
        transactions: JSON.stringify(rows),
      };
      await redirected(
        () => saveNubankImport(form(fields)),
        "quantidade=3&duplicadas=0",
      );
      await redirected(
        () => saveNubankImport(form(fields)),
        "quantidade=0&duplicadas=3",
      );
      const csv = parseNubankCsv(
        "Data,Valor,Identificador,Descrição\n01/05/2026,-10.25,ofx-expense,Mercado & Cia",
      );
      assert.equal(
        (await countImportDuplicates(csv, ofxAccount.id)).existing,
        1,
      );
      assert.equal(
        await prisma.transaction.count({ where: { accountId: ofxAccount.id } }),
        3,
      );
    },
  );
  await t.test(
    "multi-file import deduplicates across sources and rejects the entire invalid batch",
    async () => {
      const batchAccount = await prisma.account.create({
        data: { name: "Batch test", type: "CHECKING" },
      });
      const card = parseNubankCsv(
        "date,title,amount\n2026-05-01,Compra lote,10.00",
      );
      const bank = parseNubankCsv(
        "Data,Valor,Identificador,Descrição\n01/05/2026,20.00,batch-id,Receita lote",
      );
      const files = [
        { filename: "card.csv", transactions: card },
        { filename: "bank.ofx", transactions: bank },
        { filename: "overlap.csv", transactions: [...bank, ...bank] },
      ];
      const fields = {
        accountId: batchAccount.id,
        files: JSON.stringify(files),
      };
      const beforeImports = await prisma.import.count();
      await redirected(
        () =>
          saveNubankImport(
            form({
              ...fields,
              files: JSON.stringify([
                ...files,
                {
                  filename: "invalid.csv",
                  transactions: [{ ...card[0], date: "invalid" }],
                },
              ]),
            }),
          ),
        "erro=arquivo",
      );
      assert.equal(await prisma.import.count(), beforeImports);
      assert.equal(
        await prisma.transaction.count({
          where: { accountId: batchAccount.id },
        }),
        0,
      );
      const counts = await countImportDuplicates(
        files.flatMap((file) => file.transactions),
        batchAccount.id,
      );
      assert.equal(counts.newCount, 2);
      assert.equal(counts.existing, 2);
      await redirected(
        () => saveNubankImport(form(fields)),
        "quantidade=2&duplicadas=2",
      );
      assert.equal(await prisma.import.count(), beforeImports + 3);
      const saved = await prisma.transaction.findMany({
        where: { accountId: batchAccount.id },
        include: { importedIn: true },
      });
      assert.deepEqual(saved.map((row) => row.importedIn.filename).sort(), [
        "bank.ofx",
        "card.csv",
      ]);
      await redirected(
        () => saveNubankImport(form(fields)),
        "quantidade=0&duplicadas=4",
      );
      assert.equal(
        await prisma.transaction.count({
          where: { accountId: batchAccount.id },
        }),
        2,
      );
    },
  );
  await t.test(
    "RDB movements do not affect results and historical repair is backed up and idempotent",
    async () => {
      const { repairRdb } = await import("../src/lib/repair-rdb.ts");
      const { transactionFingerprint } =
        await import("../src/lib/transaction-fingerprint.ts");
      const rows = parseNubankCsv(
        "Data,Valor,Descrição\n01/09/2026,-100.00,Aplicação RDB\n02/09/2026,105.00,Resgate RDB",
      );
      assert.deepEqual(
        rows.map((r) => r.type),
        ["INVESTMENT_DEPOSIT", "INVESTMENT_WITHDRAWAL"],
      );
      for (const row of rows) {
        assert.equal(resultAmount(row.type, BigInt(row.amountCents)), 0n);
        assert.equal(expenseAmount(row.type, BigInt(row.amountCents)), 0n);
      }
      const a = await prisma.account.create({
        data: { name: "RDB test", type: "CHECKING" },
      });
      for (const row of rows) {
        const type = row.type === "INVESTMENT_DEPOSIT" ? "EXPENSE" : "INCOME";
        await prisma.transaction.create({
          data: {
            description: row.description,
            amountCents: BigInt(row.amountCents),
            type,
            occurredAt: new Date(`${row.date}T12:00:00Z`),
            sourceType: row.sourceType,
            accountId: a.id,
            fingerprint: transactionFingerprint({
              ...row,
              type,
              accountId: a.id,
            }),
          },
        });
      }
      const result = await repairRdb();
      assert.equal(result.changed, 2);
      assert.ok(
        backup.parseBackup(
          await readFile(join(directory, result.protectionFile), "utf8"),
        ),
      );
      assert.equal((await repairRdb()).changed, 0);
      assert.equal((await countImportDuplicates(rows, a.id)).existing, 2);
      const contents = backup.backupJson(await backup.createBackupObject());
      const parsed = backup.parseBackup(contents);
      assert.ok(parsed);
      await backup.restoreBackup(parsed);
      assert.equal(
        await prisma.transaction.count({
          where: {
            accountId: a.id,
            type: { in: ["INVESTMENT_DEPOSIT", "INVESTMENT_WITHDRAWAL"] },
          },
        }),
        2,
      );
    },
  );

  await t.test(
    "personal rules preserve bank identity and separate estimated ownership",
    async () => {
      const { bankTransactionType } = await import("../src/lib/nubank-csv.ts");
      const { salaryCategory } = await import("../src/lib/personal-rules.ts");
      const { repairPersonalHistory } =
        await import("../src/lib/repair-personal-history.ts");
      const { transactionFingerprint } =
        await import("../src/lib/transaction-fingerprint.ts");
      assert.equal(
        bankTransactionType("Pix Mouna Hussen Safatli", 100n),
        "MOTHER_INCOME",
      );
      assert.equal(
        bankTransactionType("Pix Mouna Hussen Safatli", -100n),
        "EXPENSE",
      );
      assert.equal(
        bankTransactionType("BAP ADMINISTRACAO", -100n),
        "MOTHER_EXPENSE",
      );
      assert.equal(bankTransactionType("Pbadministradora", -100n), "EXPENSE");
      assert.equal(bankTransactionType("PREVENT SENIOR", 100n), "INCOME");
      assert.equal(
        salaryCategory(
          "SAMI SAFATLI CAIXA ECONOMICA FEDERAL",
          "INCOME",
          "BANK_STATEMENT",
        ),
        "Salário repassado da Caixa",
      );
      assert.equal(
        salaryCategory("SAMI SAFATLI CAIXA", "EXPENSE", "BANK_STATEMENT"),
        null,
      );
      assert.equal(
        salaryCategory("SAMI SAFATLI WISE", "INCOME", "BANK_STATEMENT"),
        null,
      );
      assert.equal(
        salaryCategory("NABIL SAFATLI", "INCOME", "BANK_STATEMENT"),
        null,
      );
      for (const type of [
        "MOTHER_INCOME",
        "MOTHER_EXPENSE",
        "MOTHER_ESTIMATED_EXPENSE",
      ]) {
        assert.equal(resultAmount(type, 100n), 0n);
        assert.equal(expenseAmount(type, 100n), 0n);
      }
      const a = await prisma.account.create({
        data: { name: "Personal test", type: "CHECKING" },
      });
      const entries = [
        ["Mouna Hussen Safatli", "INCOME"],
        ["Claro", "EXPENSE"],
        ["Sami Safatli Caixa", "INCOME"],
        ["Safatli Technologies", "INCOME"],
        ["Light conta 1", "EXPENSE"],
        ["Light conta 2", "EXPENSE"],
        ["CEG conta 1", "EXPENSE"],
        ["CEG conta 2", "EXPENSE"],
        ["CEG conta 3", "EXPENSE"],
        ["Nabil Safatli", "INCOME"],
      ];
      const candidates = entries.map(([description, type]) => ({
        description,
        type,
        amountCents: "10000",
        date: "2026-09-15",
        sourceType: "BANK_STATEMENT",
        externalId: null,
      }));
      for (const row of candidates)
        await prisma.transaction.create({
          data: {
            description: row.description,
            type: row.type,
            amountCents: 10000n,
            occurredAt: new Date("2026-09-15T12:00:00Z"),
            accountId: a.id,
            sourceType: row.sourceType,
            fingerprint: transactionFingerprint({ ...row, accountId: a.id }),
          },
        });
      const repair = await repairPersonalHistory();
      assert.equal(repair.changed, 6);
      assert.equal(repair.estimatedPairs, 1);
      assert.ok(
        backup.parseBackup(
          await readFile(join(directory, repair.protectionFile), "utf8"),
        ),
      );
      assert.equal((await repairPersonalHistory()).changed, 0);
      assert.equal(
        (
          await countImportDuplicates(
            candidates.map((row) => ({
              ...row,
              type: bankTransactionType(
                row.description,
                row.type === "EXPENSE" ? -10000n : 10000n,
              ),
            })),
            a.id,
          )
        ).existing,
        10,
      );
      const stored = await prisma.transaction.findMany({
        where: { accountId: a.id },
        include: { category: true },
      });
      assert.equal(
        stored.find((r) => r.description === "Sami Safatli Caixa").category
          .name,
        "Salário repassado da Caixa",
      );
      assert.equal(
        stored.filter((r) => r.type === "MOTHER_ESTIMATED_EXPENSE").length,
        1,
      );
      assert.equal(
        stored.filter(
          (r) => r.description.startsWith("CEG") && r.type === "EXPENSE",
        ).length,
        3,
      );
      assert.equal(
        stored.filter(
          (r) => r.ownershipEstimated && r.category?.name === "Moradia",
        ).length,
        1,
      );
      const parsed = backup.parseBackup(
        backup.backupJson(await backup.createBackupObject()),
      );
      assert.ok(parsed);
      await backup.restoreBackup(parsed);
      assert.equal(
        await prisma.transaction.count({
          where: { accountId: a.id, ownershipEstimated: true },
        }),
        1,
      );

      assert.equal(
        await prisma.transaction.count({
          where: { accountId: a.id, type: { startsWith: "MOTHER_" } },
        }),
        3,
      );
      const form = new FormData();
      form.set("filename", "salary.csv");
      form.set("accountId", a.id);
      form.set(
        "transactions",
        JSON.stringify([{ ...candidates[3], date: "2026-10-15" }]),
      );
      await assert.rejects(
        saveNubankImport(form),
        (error) => !!error.destination && !error.destination.includes("erro="),
      );
      assert.equal(
        (
          await prisma.transaction.findFirst({
            where: {
              accountId: a.id,
              occurredAt: new Date("2026-10-15T12:00:00Z"),
            },
            include: { category: true },
          })
        ).category.name,
        "Salário PJ — Monety",
      );
    },
  );

  await t.test(
    "identical purchases preserve multiplicity across reimports and overlapping files",
    async () => {
      const a = await prisma.account.create({
        data: { name: "Identical purchases", type: "CHECKING" },
      });
      const row = parseNubankCsv("date,title,amount\n2026-09-01,Café,10.00")[0];
      const save = (files) =>
        saveNubankImport(
          form({
            accountId: a.id,
            files: JSON.stringify(
              files.map((transactions, i) => ({
                filename: `file-${i}.csv`,
                transactions,
              })),
            ),
          }),
        );
      const pair = [row, { ...row }];
      assert.equal(
        (await countImportDuplicates([pair, pair], a.id)).newCount,
        2,
      );
      await redirected(() => save([pair, pair]), "quantidade=2&duplicadas=2");
      assert.equal((await countImportDuplicates(pair, a.id)).existing, 2);
      await redirected(() => save([pair]), "quantidade=0&duplicadas=2");
      const triple = [...pair, { ...row }];
      assert.equal(
        (await countImportDuplicates([triple, pair], a.id)).newCount,
        1,
      );
      await redirected(() => save([triple, pair]), "quantidade=1&duplicadas=4");
      await redirected(() => save([[row]]), "quantidade=0&duplicadas=1");
      assert.equal(
        await prisma.transaction.count({ where: { accountId: a.id } }),
        3,
      );
      const contents = backup.parseBackup(
        backup.backupJson(await backup.createBackupObject()),
      );
      assert.ok(contents);
      await backup.restoreBackup(contents);
      assert.equal((await countImportDuplicates(triple, a.id)).existing, 3);
      const oldAccount = await prisma.account.create({
        data: { name: "Old identical purchases", type: "CHECKING" },
      });
      const { transactionFingerprint } =
        await import("../src/lib/transaction-fingerprint.ts");
      await prisma.transaction.create({
        data: {
          description: row.description,
          type: row.type,
          amountCents: 1000n,
          occurredAt: new Date(`${row.date}T12:00:00Z`),
          sourceType: row.sourceType,
          accountId: oldAccount.id,
          fingerprint: transactionFingerprint({
            ...row,
            accountId: oldAccount.id,
          }),
        },
      });
      assert.equal(
        (await countImportDuplicates(pair, oldAccount.id)).newCount,
        1,
      );
      await redirected(
        () =>
          saveNubankImport(
            form({
              accountId: oldAccount.id,
              filename: "old.csv",
              transactions: JSON.stringify(pair),
            }),
          ),
        "quantidade=1&duplicadas=1",
      );
      const bank = {
        ...row,
        sourceType: "BANK_STATEMENT",
        externalId: "same-bank-id",
      };
      assert.equal(
        (await countImportDuplicates([bank, bank], a.id)).newCount,
        1,
      );
      assert.equal(
        (
          await countImportDuplicates(
            [bank, { ...bank, externalId: "different-bank-id" }],
            a.id,
          )
        ).newCount,
        2,
      );
    },
  );
  console.info(
    `Isolated test database: ${pathToFileURL(join(directory, "finance.db")).href}`,
  );
});
