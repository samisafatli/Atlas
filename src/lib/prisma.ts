import "server-only";
import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { cookies } from "next/headers";
import { PROFILE_COOKIE, findProfile } from "./profiles";
import { prismaFor, profileDatabaseUrl } from "./prisma-client";

export async function currentProfile() {
  try {
    return findProfile((await cookies()).get(PROFILE_COOKIE)?.value);
  } catch {
    // Maintenance scripts run outside a request; they target the owner.
    return findProfile(undefined);
  }
}

export function profileDatabasePath(profileId: string) {
  const pathname = decodeURIComponent(
    profileDatabaseUrl(profileId).slice(5).split("?")[0],
  );
  return isAbsolute(pathname)
    ? pathname
    : resolve(/* turbopackIgnore: true */ process.cwd(), pathname);
}

// Every request reads and writes only the selected profile's database.
export async function getPrisma() {
  const profile = await currentProfile();
  // SQLite would silently create an empty file without tables.
  if (
    profileDatabaseUrl(profile.id).startsWith("file:") &&
    !existsSync(profileDatabasePath(profile.id))
  )
    throw new Error(
      `A base do perfil ${profile.name} ainda não existe. Rode "npm run db:deploy" e recarregue a página.`,
    );
  return prismaFor(profile.id);
}
