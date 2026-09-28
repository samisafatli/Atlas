import "dotenv/config";
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, nextResolve) {
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
const { reviewTrackingStart } =
  await import("../src/lib/review-tracking-start.ts");
try {
  console.log(await reviewTrackingStart());
} finally {
  await prisma.$disconnect();
}
