import "dotenv/config";
import { prisma } from "../src/lib/prisma-client.ts";

import { accountSeed, categorySeeds } from "../src/lib/default-data.ts";

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
