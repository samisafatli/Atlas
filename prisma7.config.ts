import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --disable-warning=ExperimentalWarning prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./finance.db",
  },
});
