import "dotenv/config";
import { prisma } from "../src/lib/prisma-client.ts";

const accountSeed = {
  name: "Conta principal",
  type: "CHECKING",
  currency: "BRL",
};

const categorySeeds = [
  { name: "Moradia", type: "EXPENSE" },
  { name: "Alimentação", type: "EXPENSE" },
  { name: "Transporte", type: "EXPENSE" },
  { name: "Saúde", type: "EXPENSE" },
  { name: "Lazer", type: "EXPENSE" },
  { name: "Salário", type: "INCOME" },
];

async function main() {
  await prisma.account.upsert({
    where: { name_type: { name: accountSeed.name, type: accountSeed.type } },
    update: { currency: accountSeed.currency },
    create: accountSeed,
  });

  for (const category of categorySeeds) {
    await prisma.category.upsert({
      where: { name_type: category },
      update: {},
      create: category,
    });
  }

  console.info(`Seed concluído: 1 conta e ${categorySeeds.length} categorias.`);
}

main()
  .catch((error: unknown) => {
    console.error("Falha ao carregar o seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
