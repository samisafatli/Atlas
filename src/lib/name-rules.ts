import type { prisma } from "./prisma-client";

type NameRule = { contains: string; name: string };

const fold = (text: string) =>
  text.normalize("NFKC").toLocaleLowerCase("pt-BR");

// Same matching as category rules: case-insensitive substring, longest wins.
export function matchNameRule(description: string, rules: NameRule[]) {
  const text = fold(description);
  return (
    [...rules]
      .sort(
        (left, right) =>
          right.contains.length - left.contains.length ||
          left.contains.localeCompare(right.contains),
      )
      .find((rule) => text.includes(fold(rule.contains)))?.name ?? null
  );
}

// Fills only empty notes, so a note typed by the user is never replaced.
export async function applyNameRules(
  client: Pick<typeof prisma, "nameRule" | "transaction">,
) {
  const rules = await client.nameRule.findMany();
  if (!rules.length) return 0;
  const rows = await client.transaction.findMany({
    where: { note: null },
    select: { id: true, description: true },
  });
  const byName = new Map<string, string[]>();
  for (const row of rows) {
    const name = matchNameRule(row.description, rules);
    if (name) byName.set(name, [...(byName.get(name) ?? []), row.id]);
  }
  let updated = 0;
  for (const [name, ids] of byName)
    updated += (
      await client.transaction.updateMany({
        where: { id: { in: ids }, note: null },
        data: { note: name },
      })
    ).count;
  return updated;
}
