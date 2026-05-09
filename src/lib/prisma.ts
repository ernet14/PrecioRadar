import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import type { PrismaClient as GeneratedPrismaClient } from "@/generated/prisma/client";

type GlobalWithPrisma = typeof globalThis & {
  precioRadarPrisma?: GeneratedPrismaClient;
};

function hasPlaceholderValue(value: string | undefined) {
  return !value || value.includes("[") || value.includes("]");
}

export function getPrismaConnectionUrl() {
  const candidates = [process.env.DATABASE_URL, process.env.DIRECT_URL];

  return (
    candidates
      .map((value) => value?.trim())
      .find((value) => value && !hasPlaceholderValue(value)) ?? null
  );
}

export function isDatabaseConfigured() {
  return getPrismaConnectionUrl() !== null;
}

export function getPrismaClient() {
  const databaseUrl = getPrismaConnectionUrl();

  if (!databaseUrl) {
    return null;
  }

  const globalForPrisma = globalThis as GlobalWithPrisma;

  if (!globalForPrisma.precioRadarPrisma) {
    const adapter = new PrismaPg(databaseUrl);
    globalForPrisma.precioRadarPrisma = new PrismaClient({ adapter });
  }

  return globalForPrisma.precioRadarPrisma;
}
