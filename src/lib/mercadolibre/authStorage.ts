import { getPrismaClient } from "@/lib/prisma";

export type MercadoLibreAuthRecord = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  mlUserId: string;
  scope: string | null;
};

const singletonKey = "default";

export async function readMercadoLibreAuth(): Promise<MercadoLibreAuthRecord | null> {
  const prisma = getPrismaClient();
  if (!prisma) return null;

  try {
    const row = await prisma.mercadoLibreAuth.findUnique({
      where: { singletonKey },
    });
    if (!row) return null;
    return {
      accessToken: row.accessToken,
      refreshToken: row.refreshToken,
      expiresAt: row.expiresAt,
      mlUserId: row.mlUserId,
      scope: row.scope,
    };
  } catch {
    return null;
  }
}

export async function writeMercadoLibreAuth(record: MercadoLibreAuthRecord): Promise<boolean> {
  const prisma = getPrismaClient();
  if (!prisma) return false;

  try {
    await prisma.mercadoLibreAuth.upsert({
      where: { singletonKey },
      create: {
        singletonKey,
        accessToken: record.accessToken,
        refreshToken: record.refreshToken,
        expiresAt: record.expiresAt,
        mlUserId: record.mlUserId,
        scope: record.scope,
      },
      update: {
        accessToken: record.accessToken,
        refreshToken: record.refreshToken,
        expiresAt: record.expiresAt,
        mlUserId: record.mlUserId,
        scope: record.scope,
      },
    });
    return true;
  } catch {
    return false;
  }
}
