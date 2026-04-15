import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  var prisma: PrismaClient | undefined;
}

const localFallbackUrl = "postgresql://postgres:postgres@127.0.0.1:5432/familytree";
const configuredConnectionString =
  process.env.DATABASE_URL ?? (process.env.VERCEL ? null : localFallbackUrl);

if (!configuredConnectionString) {
  throw new Error(
    "DATABASE_URL is required to start the server on Vercel.",
  );
}

const connectionString = configuredConnectionString;

function createClient() {
  const pool = new Pool({
    connectionString,
  });

  return new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma =
  global.prisma ??
  createClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
