import "dotenv/config";
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
const { prisma } = await import("../src/lib/prisma-client.ts");
const { repairRdb } = await import("../src/lib/repair-rdb.ts");
try {
  console.log(await repairRdb());
} finally {
  await prisma.$disconnect();
}
