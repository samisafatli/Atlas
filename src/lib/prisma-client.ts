import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client.ts";
import { DEFAULT_PROFILE_ID, findProfile } from "./profiles.ts";

// The default profile keeps DATABASE_URL; other profiles sit next to it as
// finance-<id>.db, so moving the main database moves every profile.
export function profileDatabaseUrl(profileId: string) {
  const base = process.env.DATABASE_URL ?? "file:./finance.db";
  const profile = findProfile(profileId);
  if (profile.id === DEFAULT_PROFILE_ID) return base;
  if (!base.startsWith("file:"))
    throw new Error("Perfis adicionais precisam de uma base SQLite local.");
  const [path, query] = base.slice(5).split("?");
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  const directory = slash >= 0 ? path.slice(0, slash + 1) : "";
  return `file:${directory}finance-${profile.id}.db${query ? `?${query}` : ""}`;
}

const createPrismaClient = (url: string) =>
  new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

type Client = ReturnType<typeof createPrismaClient>;
const globalForPrisma = globalThis as typeof globalThis & {
  prismaClients?: Map<string, Client>;
};
const clients = (globalForPrisma.prismaClients ??= new Map<string, Client>());

export function prismaFor(profileId: string) {
  const url = profileDatabaseUrl(profileId);
  let client = clients.get(url);
  if (!client) {
    client = createPrismaClient(url);
    clients.set(url, client);
  }
  return client;
}

// Scripts, seed and tests work on the default profile.
export const prisma = prismaFor(DEFAULT_PROFILE_ID);
