import { createHash, randomBytes } from "node:crypto";
import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { ApiTier } from "@/lib/apiTiers";

// Autenticación de la API pública pagada (Etapa 18). La clave en claro tiene
// formato `pr_live_<secreto>` y NUNCA se guarda: solo persistimos su hash
// SHA-256. La búsqueda es por hash (índice único), así no exponemos la clave.

const KEY_PREFIX = "pr_live_";
// Solo refrescamos lastUsedAt si pasó este intervalo, para no escribir en cada
// request de una clave activa.
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw.trim()).digest("hex");
}

export function generateApiKey(): { raw: string; keyHash: string; prefix: string } {
  const raw = `${KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
  return {
    raw,
    keyHash: hashApiKey(raw),
    // Guardamos un prefijo identificable (pr_live_ + 8 chars) para reconocer la
    // clave en el panel sin poder reconstruirla.
    prefix: raw.slice(0, KEY_PREFIX.length + 8),
  };
}

export type ApiAuthResult =
  | { ok: true; apiKeyId: string; tier: ApiTier; name: string }
  | { ok: false; status: 401 | 503; reason: string };

function readKeyFromRequest(request: Request): string {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";
  const headerKey = request.headers.get("x-api-key")?.trim() ?? "";
  return bearer || headerKey;
}

async function touchLastUsed(id: string, lastUsedAt: Date | null): Promise<void> {
  if (lastUsedAt && Date.now() - lastUsedAt.getTime() < TOUCH_INTERVAL_MS) return;

  const prisma = getPrismaClient();
  if (!prisma) return;

  try {
    await prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } });
  } catch (error) {
    logger.error("No se pudo actualizar lastUsedAt de la API key.", {
      error,
      route: "lib/apiAuth.touchLastUsed",
    });
  }
}

export async function authenticateApiKey(request: Request): Promise<ApiAuthResult> {
  const raw = readKeyFromRequest(request);
  if (!raw) return { ok: false, status: 401, reason: "missing_api_key" };

  const prisma = getPrismaClient();
  if (!prisma) return { ok: false, status: 503, reason: "database_unavailable" };

  const record = await prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(raw) } });
  if (!record || !record.active || record.revokedAt) {
    return { ok: false, status: 401, reason: "invalid_api_key" };
  }

  await touchLastUsed(record.id, record.lastUsedAt);

  return { ok: true, apiKeyId: record.id, tier: record.tier as ApiTier, name: record.name };
}
