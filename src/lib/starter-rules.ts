import type { prisma } from "./prisma-client";
import { matchCategoryRule, sortCategoryRules } from "./category-rules";
import { categoryType } from "./transaction-types";

// Common Rio merchants as Nubank writes them. Terms avoid short words that
// hide inside others: "mercado" (Mercado Pago), "raia" (praia), "posto"
// (imposto), "uber" alone (Uber Eats). Matching is accent-sensitive.
export const starterRules = [
  ["mercadolivre", "Compras"],
  ["shopee", "Compras"],
  ["shein", "Compras"],
  ["aliexpress", "Compras"],
  ["amazon", "Compras"],
  ["lojas americanas", "Compras"],
  ["magalu", "Compras"],
  ["magazine luiza", "Compras"],
  ["kabum", "Compras"],
  ["casas bahia", "Compras"],
  ["supermercado", "Mercado"],
  ["supermerc", "Mercado"],
  ["hortifruti", "Mercado"],
  ["hortifrutti", "Mercado"],
  ["casas guanabara", "Mercado"],
  ["prezunic", "Mercado"],
  ["pao de acucar", "Mercado"],
  ["carrefour", "Mercado"],
  ["assai", "Mercado"],
  ["atacadao", "Mercado"],
  ["terra market", "Mercado"],
  // "ifood" alone matches merchants such as "Taguifoods".
  ["nupay - ifood", "Alimentação"],
  ["ifood.com", "Alimentação"],
  ["ifood *", "Alimentação"],
  ["ifd*", "Alimentação"],
  ["zé delivery", "Alimentação"],
  ["rappi", "Alimentação"],
  ["uber eats", "Alimentação"],
  ["restaurante", "Alimentação"],
  ["padaria", "Alimentação"],
  ["lanchonete", "Alimentação"],
  ["mcdonalds", "Alimentação"],
  ["burger king", "Alimentação"],
  ["uber *trip", "Transporte"],
  ["autoposto", "Transporte"],
  ["auto posto", "Transporte"],
  ["posto de gasolina", "Transporte"],
  ["posto ipiranga", "Transporte"],
  ["posto shell", "Transporte"],
  ["estacionamento", "Transporte"],
  ["estac shopping", "Transporte"],
  ["metro rj", "Transporte"],
  ["supervia", "Transporte"],
  ["drogaria", "Saúde"],
  ["drogasil", "Saúde"],
  ["drogasmil", "Saúde"],
  ["farmacia", "Saúde"],
  ["smartfit", "Saúde"],
  ["netflix", "Assinaturas"],
  ["spotify", "Assinaturas"],
  ["disney", "Assinaturas"],
  ["globoplay", "Assinaturas"],
  ["youtube", "Assinaturas"],
  ["amazonprimebr", "Assinaturas"],
  ["apple.com/bill", "Assinaturas"],
  ["ingresso", "Lazer"],
  ["sympla", "Lazer"],
  ["cinemark", "Lazer"],
  ["steam", "Lazer"],
  ["playstation", "Lazer"],
  ["booking.com", "Viagem"],
  ["airbnb", "Viagem"],
  ["latam", "Viagem"],
  ["gol linhas", "Viagem"],
] as const;

type Client = typeof prisma;

// Explicit maintenance: adds missing rules and, optionally, fills the
// category of uncategorized transactions. Existing rules (including disabled
// ones) and categories already chosen are never changed; missing categories
// are reported instead of created.
export async function installStarterRules(
  client: Client,
  { categorizeHistory = false, dryRun = false } = {},
) {
  return client.$transaction(
    async (tx) => {
      const existing = await tx.categoryRule.findMany();
      const categories = await tx.category.findMany({
        where: { type: "EXPENSE" },
      });
      const added: string[] = [];
      const missingCategories = new Set<string>();
      for (const [contains, name] of starterRules) {
        if (
          existing.some(
            (rule) =>
              rule.contains.toLocaleLowerCase("pt-BR") ===
              contains.toLocaleLowerCase("pt-BR"),
          )
        )
          continue;
        const category = categories.find((item) => item.name === name);
        if (!category) {
          missingCategories.add(name);
          continue;
        }
        if (!dryRun)
          await tx.categoryRule.create({
            data: { contains, categoryId: category.id },
          });
        added.push(contains);
      }
      const categorized = new Map<string, number>();
      if (categorizeHistory) {
        const rules = sortCategoryRules([
          ...(await tx.categoryRule.findMany({
            where: { enabled: true },
            include: { category: true },
          })),
          // A dry run has not saved the new rules, so match them in memory.
          ...(dryRun
            ? added.map((contains, index) => {
                const name = starterRules.find(
                  ([term]) => term === contains,
                )![1];
                return {
                  id: `dry-${index}`,
                  contains,
                  createdAt: new Date(),
                  category: categories.find((item) => item.name === name)!,
                };
              })
            : []),
        ]);
        const rows = await tx.transaction.findMany({
          where: { categoryId: null },
        });
        for (const row of rows) {
          const type = categoryType(row.type);
          if (!type) continue;
          const match = matchCategoryRule(row.description, type, rules);
          if (!match) continue;
          if (!dryRun)
            await tx.transaction.update({
              where: { id: row.id },
              data: { categoryId: match.category.id },
            });
          const key = `${match.category.name} ← ${match.contains}`;
          categorized.set(key, (categorized.get(key) ?? 0) + 1);
        }
      }
      return {
        addedRules: added,
        missingCategories: [...missingCategories],
        categorized: Object.fromEntries(
          [...categorized].sort((left, right) => right[1] - left[1]),
        ),
      };
    },
    { timeout: 60000 },
  );
}
