// Explicit one-time maintenance, never run automatically: installs the
// starter category rules in every profile and categorizes the owner's
// uncategorized history. Pass --dry-run to only report what would change.
import "dotenv/config";
import Database from "better-sqlite3";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, nextResolve) {
    // Scripts run outside a request: no profile cookie, so the owner's base.
    if (specifier === "next/headers")
      return {
        url: "data:text/javascript,export async function cookies() { return { get() {} }; }",
        shortCircuit: true,
      };
    if (specifier === "server-only")
      return { url: "data:text/javascript,export{}", shortCircuit: true };
    if (specifier.startsWith("@/"))
      return nextResolve(
        new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    if (
      !context.parentURL?.includes("/node_modules/") &&
      specifier.startsWith(".") &&
      !/\.[a-z]+$/i.test(specifier)
    )
      return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
});
const { profiles } = await import("../src/lib/profiles.ts");
const { prismaFor } = await import("../src/lib/prisma-client.ts");
const { profileDatabasePath } = await import("../src/lib/prisma.ts");
const { installStarterRules } = await import("../src/lib/starter-rules.ts");

const dryRun = process.argv.includes("--dry-run");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
for (const profile of profiles) {
  const client = prismaFor(profile.id);
  try {
    if (!dryRun) {
      // A consistent SQLite copy, safe while the app is running.
      const path = profileDatabasePath(profile.id);
      const target = join(
        dirname(path),
        "backups",
        `finance-${profile.id}-pre-starter-rules-${stamp}.db`,
      );
      await mkdir(dirname(target), { recursive: true });
      const database = new Database(path, { readonly: true });
      await database.backup(target);
      database.close();
      console.info(`${profile.name}: cópia em ${target}`);
    }
    const result = await installStarterRules(client, {
      // Only the owner asked to organize past months.
      categorizeHistory: profile.personalRules,
      dryRun,
    });
    console.info(`\n${profile.name}${dryRun ? " (simulação)" : ""}:`);
    console.dir(result, { depth: null });
  } finally {
    await client.$disconnect();
  }
}
