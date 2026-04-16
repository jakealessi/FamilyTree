import "dotenv/config";

import { defineConfig } from "prisma/config";

const localFallbackUrl = "postgresql://postgres:postgres@127.0.0.1:5432/familytree";
const localFallback = process.env.VERCEL ? undefined : localFallbackUrl;
const datasourceUrl = process.env.DATABASE_URL ?? localFallback;
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

if (!datasourceUrl) {
  throw new Error(
    "Prisma requires DATABASE_URL on Vercel or in CI. Set it before running Prisma there.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: datasourceUrl,
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});
