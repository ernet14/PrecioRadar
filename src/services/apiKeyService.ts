import { generateApiKey } from "@/lib/apiAuth";
import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { ApiTier } from "@/lib/apiTiers";

// Gestión de API keys de la API pública (Etapa 18) para el panel admin.
// Nunca expone keyHash; la clave en claro solo se devuelve al crearla.

export type ApiKeyListItem = {
  id: string;
  name: string;
  prefix: string;
  tier: ApiTier;
  ownerEmail: string | null;
  active: boolean;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export async function listApiKeys(): Promise<ApiKeyListItem[]> {
  const prisma = getPrismaClient();
  if (!prisma) return [];

  const rows = await prisma.apiKey.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      prefix: true,
      tier: true,
      ownerEmail: true,
      active: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return rows.map((row) => ({ ...row, tier: row.tier as ApiTier }));
}

export async function createApiKeyRecord(input: {
  name: string;
  tier: ApiTier;
  ownerEmail?: string | null;
}): Promise<{ id: string; rawKey: string } | null> {
  const prisma = getPrismaClient();
  if (!prisma) return null;

  const { raw, keyHash, prefix } = generateApiKey();

  try {
    const record = await prisma.apiKey.create({
      data: {
        name: input.name,
        tier: input.tier,
        keyHash,
        prefix,
        ownerEmail: input.ownerEmail ?? null,
      },
      select: { id: true },
    });
    return { id: record.id, rawKey: raw };
  } catch (error) {
    logger.error("No se pudo crear la API key.", { error, route: "apiKeyService.createApiKeyRecord" });
    return null;
  }
}

export async function revokeApiKey(id: string): Promise<boolean> {
  const prisma = getPrismaClient();
  if (!prisma) return false;

  try {
    await prisma.apiKey.update({
      where: { id },
      data: { active: false, revokedAt: new Date() },
    });
    return true;
  } catch (error) {
    logger.error("No se pudo revocar la API key.", { error, route: "apiKeyService.revokeApiKey" });
    return false;
  }
}
