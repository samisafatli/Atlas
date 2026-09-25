import "server-only";
import { prisma } from "@/lib/prisma";

type Rule = {
  id: string;
  contains: string;
  category: { id: string; name: string; type: string };
  createdAt: Date;
};

export function sortCategoryRules<
  T extends { contains: string; createdAt: Date; id: string },
>(rules: T[]) {
  return rules.sort(
    (left, right) =>
      right.contains.length - left.contains.length ||
      left.createdAt.getTime() - right.createdAt.getTime() ||
      left.id.localeCompare(right.id),
  );
}

export function matchCategoryRule(
  description: string,
  type: string,
  rules: Rule[],
) {
  const normalizedDescription = description
    .normalize("NFKC")
    .toLocaleLowerCase("pt-BR");
  return rules.find(
    (rule) =>
      rule.category.type === type &&
      normalizedDescription.includes(
        rule.contains.normalize("NFKC").toLocaleLowerCase("pt-BR"),
      ),
  );
}

export async function findCategoryByRule(description: string, type: string) {
  const rules = await prisma.categoryRule.findMany({
    where: { enabled: true, category: { type } },
    include: { category: true },
  });
  return matchCategoryRule(description, type, sortCategoryRules(rules));
}
