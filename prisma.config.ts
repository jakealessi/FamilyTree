import "dotenv/config";

import { defineConfig } from "prisma/config";

const fallbackUrl = "postgresql://postgres:postgres@127.0.0.1:5432/familytree";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? fallbackUrl,
    shadowDatabaseUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? fallbackUrl,
  },
});
