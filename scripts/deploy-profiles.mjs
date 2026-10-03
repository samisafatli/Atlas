// Applies migrations to every profile database; a database created by this
// run also receives the default account and categories. Existing databases
// are never seeded again, so deleted default categories stay deleted.
import "dotenv/config";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, nextResolve) {
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
const { prisma, profileDatabaseUrl } =
  await import("../src/lib/prisma-client.ts");
await prisma.$disconnect();

function run(args, url) {
  const result = spawnSync(
    "npx",
    ["prisma", ...args, "--config", "prisma7.config.ts"],
    {
      env: { ...process.env, DATABASE_URL: url },
      shell: process.platform === "win32",
      stdio: "inherit",
    },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const profile of profiles) {
  const url = profileDatabaseUrl(profile.id);
  const created =
    url.startsWith("file:") && !existsSync(url.slice(5).split("?")[0]);
  console.info(`\n${profile.name}: ${url}`);
  run(["migrate", "deploy"], url);
  if (created) run(["db", "seed"], url);
}
