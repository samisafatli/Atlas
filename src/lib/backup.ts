import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { prisma } from "@/lib/prisma";

export const BACKUP_FORMAT = "atlas-backup";
export const BACKUP_VERSION = 1;

type Reader = Pick<
  typeof prisma,
  | "account"
  | "category"
  | "import"
  | "categoryRule"
  | "transaction"
  | "assetAccount"
  | "assetSnapshot"
  | "assetSnapshotValue"
>;

async function readBackupData(client: Reader) {
  const [
    accounts,
    categories,
    imports,
    categoryRules,
    transactions,
    assetAccounts,
    assetSnapshots,
    assetSnapshotValues,
  ] = await Promise.all([
    client.account.findMany({ orderBy: { id: "asc" } }),
    client.category.findMany({ orderBy: { id: "asc" } }),
    client.import.findMany({ orderBy: { id: "asc" } }),
    client.categoryRule.findMany({ orderBy: { id: "asc" } }),
    client.transaction.findMany({ orderBy: { id: "asc" } }),
    client.assetAccount.findMany({ orderBy: { id: "asc" } }),
    client.assetSnapshot.findMany({ orderBy: { id: "asc" } }),
    client.assetSnapshotValue.findMany({
      orderBy: [{ snapshotId: "asc" }, { accountId: "asc" }],
    }),
  ]);
  return {
    accounts,
    categories,
    imports,
    categoryRules,
    transactions,
    assetAccounts,
    assetSnapshots,
    assetSnapshotValues,
  };
}

export async function createBackupObject() {
  const data = await prisma.$transaction((tx) => readBackupData(tx));
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function backupJson(value: unknown) {
  return JSON.stringify(
    value,
    (_key, current: unknown) =>
      typeof current === "bigint" ? current.toString() : current,
    2,
  );
}

export function resolveDatabasePath() {
  const connection = process.env.DATABASE_URL ?? "file:./finance.db";
  if (!connection.startsWith("file:"))
    throw new Error("O backup JSON precisa de uma base SQLite local.");
  const pathname = decodeURIComponent(connection.slice(5).split("?")[0]);
  return isAbsolute(pathname)
    ? pathname
    : resolve(/* turbopackIgnore: true */ process.cwd(), pathname);
}

export async function saveProtectionBackup(contents: string) {
  const databasePath = resolveDatabasePath();
  const backupDirectory = join(dirname(databasePath), "backups");
  await mkdir(backupDirectory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `atlas-pre-restore-${stamp}.json`;
  await writeFile(join(backupDirectory, filename), contents, { flag: "wx" });
  return join("backups", filename);
}

type Timed = { id: string; createdAt: string; updatedAt: string };
type BackupData = {
  accounts: (Timed & { name: string; type: string; currency: string })[];
  categories: (Timed & { name: string; type: string })[];
  imports: {
    id: string;
    filename: string;
    importedAt: string;
    transactionCount: number;
  }[];
  categoryRules: (Timed & {
    contains: string;
    categoryId: string;
    enabled: boolean;
  })[];
  transactions: (Timed & {
    description: string;
    amountCents: string;
    type: string;
    occurredAt: string;
    accountId: string;
    categoryId: string | null;
    importId: string | null;
    fingerprint: string | null;
  })[];
  assetAccounts: (Timed & {
    name: string;
    institution: string;
    type: string;
    currency: string;
  })[];
  assetSnapshots: (Timed & { snapshotDate: string; totalCents: string })[];
  assetSnapshotValues: {
    snapshotId: string;
    accountId: string;
    amountCents: string;
  }[];
};
type BackupDocument = {
  format: string;
  version: number;
  exportedAt: string;
  data: BackupData;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function isDate(value: unknown): value is string {
  return (
    typeof value === "string" && Number.isFinite(new Date(value).getTime())
  );
}
function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 200;
}
function isIntString(value: unknown): value is string {
  return typeof value === "string" && /^-?\d+$/.test(value);
}

export function parseBackup(contents: string): BackupDocument | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    return null;
  }
  if (
    !isObject(parsed) ||
    parsed.format !== BACKUP_FORMAT ||
    parsed.version !== BACKUP_VERSION ||
    !isDate(parsed.exportedAt) ||
    !isObject(parsed.data)
  )
    return null;
  const rawData = parsed.data;
  const keys = [
    "accounts",
    "categories",
    "imports",
    "categoryRules",
    "transactions",
    "assetAccounts",
    "assetSnapshots",
    "assetSnapshotValues",
  ] as const;
  if (
    keys.some(
      (key) =>
        !Array.isArray(rawData[key]) ||
        !(rawData[key] as unknown[]).every(isObject),
    )
  )
    return null;
  const data = rawData as unknown as BackupData;
  const ids = new Map<string, Set<string>>();
  for (const key of keys.filter((name) => name !== "assetSnapshotValues")) {
    const rows = data[key];
    if (rows.some((row) => !isId(row.id))) return null;
    ids.set(key, new Set(rows.map((row) => String(row.id))));
    if (ids.get(key)!.size !== rows.length) return null;
  }
  const allTimed = [
    "accounts",
    "categories",
    "categoryRules",
    "transactions",
    "assetAccounts",
    "assetSnapshots",
  ] as const;
  if (
    allTimed.some((key) =>
      data[key].some((row) => !isDate(row.createdAt) || !isDate(row.updatedAt)),
    )
  )
    return null;
  const isUniqueBy = (rows: { [key: string]: unknown }[], fields: string[]) => {
    const uniqueValues = new Set<string>();
    for (const row of rows) {
      const value = fields
        .map((field) => String(row[field] ?? ""))
        .join("\u001f");
      if (uniqueValues.has(value)) return false;
      uniqueValues.add(value);
    }
    return true;
  };
  if (
    !isUniqueBy(data.accounts, ["name", "type"]) ||
    !isUniqueBy(data.categories, ["name", "type"]) ||
    !isUniqueBy(data.categoryRules, ["contains", "categoryId"]) ||
    !isUniqueBy(data.assetAccounts, ["name", "institution"]) ||
    !isUniqueBy(data.assetSnapshots, ["snapshotDate"]) ||
    !isUniqueBy(data.assetSnapshotValues, ["snapshotId", "accountId"])
  )
    return null;
  const accountIds = ids.get("accounts")!;
  const categoryIds = ids.get("categories")!;
  const importIds = ids.get("imports")!;
  const assetIds = ids.get("assetAccounts")!;
  const snapshotIds = ids.get("assetSnapshots")!;
  if (
    data.accounts.some(
      (row) =>
        typeof row.name !== "string" ||
        typeof row.type !== "string" ||
        typeof row.currency !== "string",
    )
  )
    return null;
  if (
    data.categories.some(
      (row) =>
        typeof row.name !== "string" ||
        !["INCOME", "EXPENSE"].includes(String(row.type)),
    )
  )
    return null;
  if (
    data.imports.some(
      (row) =>
        typeof row.filename !== "string" ||
        !isDate(row.importedAt) ||
        !Number.isInteger(row.transactionCount) ||
        Number(row.transactionCount) < 0,
    )
  )
    return null;
  if (
    data.categoryRules.some(
      (row) =>
        typeof row.contains !== "string" ||
        !row.contains.trim() ||
        !categoryIds.has(String(row.categoryId)) ||
        typeof row.enabled !== "boolean",
    )
  )
    return null;
  const fingerprints = new Set<string>();
  if (
    data.transactions.some((row) => {
      if (
        typeof row.description !== "string" ||
        !row.description.trim() ||
        !isIntString(row.amountCents) ||
        BigInt(row.amountCents) <= 0n ||
        !["INCOME", "EXPENSE"].includes(String(row.type)) ||
        !isDate(row.occurredAt) ||
        !accountIds.has(String(row.accountId)) ||
        (row.categoryId !== null &&
          row.categoryId !== undefined &&
          !categoryIds.has(String(row.categoryId))) ||
        (row.importId !== null &&
          row.importId !== undefined &&
          !importIds.has(String(row.importId)))
      )
        return true;
      if (row.fingerprint !== null && row.fingerprint !== undefined) {
        if (
          typeof row.fingerprint !== "string" ||
          fingerprints.has(row.fingerprint)
        )
          return true;
        fingerprints.add(row.fingerprint);
      }
      return false;
    })
  )
    return null;
  for (const row of data.transactions) {
    if (row.categoryId) {
      const category = data.categories.find(
        (candidate) => candidate.id === row.categoryId,
      );
      if (!category || category.type !== row.type) return null;
    }
  }
  if (
    data.assetAccounts.some(
      (row) =>
        typeof row.name !== "string" ||
        typeof row.institution !== "string" ||
        typeof row.type !== "string" ||
        typeof row.currency !== "string",
    )
  )
    return null;
  if (
    data.assetSnapshots.some(
      (row) =>
        !isDate(row.snapshotDate) ||
        !isIntString(row.totalCents) ||
        BigInt(row.totalCents) < 0n,
    )
  )
    return null;
  if (
    data.assetSnapshotValues.some(
      (row) =>
        !snapshotIds.has(String(row.snapshotId)) ||
        !assetIds.has(String(row.accountId)) ||
        !isIntString(row.amountCents) ||
        BigInt(row.amountCents) < 0n,
    )
  )
    return null;
  const snapshotTotals = new Map<string, bigint>();
  for (const value of data.assetSnapshotValues)
    snapshotTotals.set(
      String(value.snapshotId),
      (snapshotTotals.get(String(value.snapshotId)) ?? 0n) +
        BigInt(String(value.amountCents)),
    );
  if (
    data.assetSnapshots.some(
      (row) =>
        (snapshotTotals.get(String(row.id)) ?? 0n) !==
        BigInt(String(row.totalCents)),
    )
  )
    return null;
  return parsed as unknown as BackupDocument;
}

async function insertBatches<T>(
  rows: T[],
  insert: (batch: T[]) => Promise<unknown>,
) {
  for (let index = 0; index < rows.length; index += 100)
    await insert(rows.slice(index, index + 100));
}

export async function restoreBackup(document: BackupDocument) {
  const data = document.data;
  return prisma.$transaction(
    async (tx) => {
      const current = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data: await readBackupData(tx),
      };
      const protectionFile = await saveProtectionBackup(backupJson(current));
      await tx.assetSnapshot.deleteMany();
      await tx.assetAccount.deleteMany();
      await tx.transaction.deleteMany();
      await tx.categoryRule.deleteMany();
      await tx.import.deleteMany();
      await tx.category.deleteMany();
      await tx.account.deleteMany();
      await insertBatches(
        data.accounts.map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          currency: row.currency,
          createdAt: new Date(String(row.createdAt)),
          updatedAt: new Date(String(row.updatedAt)),
        })),
        (batch) => tx.account.createMany({ data: batch }),
      );
      await insertBatches(
        data.categories.map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          createdAt: new Date(String(row.createdAt)),
          updatedAt: new Date(String(row.updatedAt)),
        })),
        (batch) => tx.category.createMany({ data: batch }),
      );
      await insertBatches(
        data.imports.map((row) => ({
          id: row.id,
          filename: row.filename,
          importedAt: new Date(String(row.importedAt)),
          transactionCount: row.transactionCount as number,
        })),
        (batch) => tx.import.createMany({ data: batch }),
      );
      await insertBatches(
        data.categoryRules.map((row) => ({
          id: row.id,
          contains: row.contains,
          categoryId: row.categoryId,
          enabled: row.enabled as boolean,
          createdAt: new Date(String(row.createdAt)),
          updatedAt: new Date(String(row.updatedAt)),
        })),
        (batch) => tx.categoryRule.createMany({ data: batch }),
      );
      await insertBatches(
        data.transactions.map((row) => ({
          id: row.id,
          description: row.description,
          amountCents: BigInt(String(row.amountCents)),
          type: row.type,
          occurredAt: new Date(String(row.occurredAt)),
          accountId: row.accountId,
          categoryId: row.categoryId as string | null,
          importId: row.importId as string | null,
          fingerprint: row.fingerprint as string | null,
          createdAt: new Date(String(row.createdAt)),
          updatedAt: new Date(String(row.updatedAt)),
        })),
        (batch) => tx.transaction.createMany({ data: batch }),
      );
      await insertBatches(
        data.assetAccounts.map((row) => ({
          id: row.id,
          name: row.name,
          institution: row.institution,
          type: row.type,
          currency: row.currency,
          createdAt: new Date(String(row.createdAt)),
          updatedAt: new Date(String(row.updatedAt)),
        })),
        (batch) => tx.assetAccount.createMany({ data: batch }),
      );
      await insertBatches(
        data.assetSnapshots.map((row) => ({
          id: row.id,
          snapshotDate: new Date(String(row.snapshotDate)),
          totalCents: BigInt(String(row.totalCents)),
          createdAt: new Date(String(row.createdAt)),
          updatedAt: new Date(String(row.updatedAt)),
        })),
        (batch) => tx.assetSnapshot.createMany({ data: batch }),
      );
      await insertBatches(
        data.assetSnapshotValues.map((row) => ({
          snapshotId: row.snapshotId,
          accountId: row.accountId,
          amountCents: BigInt(String(row.amountCents)),
        })),
        (batch) => tx.assetSnapshotValue.createMany({ data: batch }),
      );
      return protectionFile;
    },
    { timeout: 120000 },
  );
}
