import "dotenv/config";
import Database from "better-sqlite3";
import { readFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { prisma } from "../src/lib/prisma-client.ts";
import { repairImport } from "../src/lib/repair-import.ts";

const [importId, csvPath] = process.argv.slice(2);
if (!importId || !csvPath)
  throw new Error(
    "Uso: node scripts/repair-import.mjs <id-do-lote> <csv-original>",
  );
try {
  const record = await prisma.import.findUniqueOrThrow({
    where: { id: importId },
  });
  if (record.parserVersion >= 2)
    console.log("Lote já corrigido; nenhum dado alterado.");
  else {
    const connection = process.env.DATABASE_URL ?? "file:./finance.db";
    if (!connection.startsWith("file:"))
      throw new Error("É necessário um SQLite local.");
    const databasePath = resolve(
      decodeURIComponent(connection.slice(5).split("?")[0]),
    );
    const contents = await readFile(csvPath, "utf8");
    const folder = join(dirname(databasePath), "backups");
    await mkdir(folder, { recursive: true });
    const protectionPath = join(
      folder,
      `atlas-before-import-repair-${Date.now()}.db`,
    );
    const database = new Database(databasePath, { readonly: true });
    try {
      await database.backup(protectionPath);
    } finally {
      database.close();
    }
    console.log(`Backup de proteção: ${protectionPath}`);
    console.log(await repairImport(prisma, importId, contents));
  }
} finally {
  await prisma.$disconnect();
}
