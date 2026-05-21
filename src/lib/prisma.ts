import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import type { PrismaClient as GeneratedPrismaClient } from "@/generated/prisma/client";
import { logger } from "@/lib/logger";

type GlobalWithPrisma = typeof globalThis & {
  precioRadarPrisma?: GeneratedPrismaClient;
};

// Conexiones del pool pg POR INSTANCIA serverless. En Vercel cada instancia
// abre su propio pool, así que mantenerlo bajo evita agotar el límite de
// clientes del pooler de Supabase (15 en el pooler de transacción). El
// DATABASE_URL debe apuntar al transaction pooler (puerto 6543), no al session
// pooler (5432). Override puntual con DATABASE_POOL_MAX.
const DEFAULT_POOL_MAX = 3;

function getPoolMax() {
  const parsed = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_POOL_MAX;
}

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
    const adapter = new PrismaPg(
      {
        connectionString: databaseUrl,
        max: getPoolMax(),
        // Liberar conexiones ociosas rápido para devolverlas al pooler.
        idleTimeoutMillis: 10_000,
        // Si el pool está saturado, fallar rápido en vez de colgar el request.
        connectionTimeoutMillis: 10_000,
      },
      {
        // Sin handler, un error de conexión del pool podía tumbar el proceso.
        onPoolError: (error) =>
          logger.error("Prisma pg pool error.", { error, route: "lib/prisma" }),
      },
    );
    globalForPrisma.precioRadarPrisma = new PrismaClient({ adapter });
  }

  return globalForPrisma.precioRadarPrisma;
}
