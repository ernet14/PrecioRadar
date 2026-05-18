import { getPrismaClient } from "@/lib/prisma";

export type MercadoLibreEndpoint = "items" | "search" | "categories";

const ttlSecondsByEndpoint: Record<MercadoLibreEndpoint, number> = {
  items: 4 * 60 * 60,
  search: 60 * 60,
  categories: 24 * 60 * 60,
};

export function getTtlSeconds(endpoint: MercadoLibreEndpoint): number {
  return ttlSecondsByEndpoint[endpoint];
}

export function buildCacheKey(
  endpoint: MercadoLibreEndpoint,
  identifier: string,
): string {
  return `${endpoint}:${identifier}`;
}

export async function getCachedResponse(
  cacheKey: string,
): Promise<unknown | null> {
  const prisma = getPrismaClient();
  if (!prisma) return null;

  try {
    const entry = await prisma.mercadoLibreCache.findUnique({
      where: { cacheKey },
    });

    if (!entry) return null;
    if (entry.expiresAt.getTime() <= Date.now()) return null;

    return entry.body as unknown;
  } catch {
    return null;
  }
}

export async function setCachedResponse({
  body,
  cacheKey,
  endpoint,
}: {
  cacheKey: string;
  endpoint: MercadoLibreEndpoint;
  body: unknown;
}): Promise<void> {
  const prisma = getPrismaClient();
  if (!prisma) return;

  const expiresAt = new Date(Date.now() + ttlSecondsByEndpoint[endpoint] * 1000);

  try {
    await prisma.mercadoLibreCache.upsert({
      create: {
        body: body as never,
        cacheKey,
        endpoint,
        expiresAt,
      },
      update: {
        body: body as never,
        endpoint,
        expiresAt,
      },
      where: { cacheKey },
    });
  } catch {
    // Cache write failures should never block the request path.
  }
}

export async function purgeExpiredCache(): Promise<number> {
  const prisma = getPrismaClient();
  if (!prisma) return 0;

  try {
    const result = await prisma.mercadoLibreCache.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  } catch {
    return 0;
  }
}
