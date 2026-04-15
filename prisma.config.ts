import "dotenv/config";

import { defineConfig } from "prisma/config";

const localFallbackUrl = "postgresql://postgres:postgres@127.0.0.1:5432/familytree";
const localFallback = process.env.VERCEL ? undefined : localFallbackUrl;
const datasourceUrl = process.env.DATABASE_URL ?? localFallback;
const shadowDatabaseUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  localFallback;

if (!datasourceUrl || !shadowDatabaseUrl) {
  throw new Error(
    "Prisma requires DATABASE_URL and DIRECT_URL on Vercel or in CI. Set them before running Prisma there.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: datasourceUrl,
    shadowDatabaseUrl,
  },
});
