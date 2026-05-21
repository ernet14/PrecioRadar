-- API pública pagada (Etapa 18): claves con tier para rate limit y profundidad
-- de historial. Solo se guarda el hash de la clave. RLS deny-all (solo
-- service_role accede; la app usa service role vía adapter pg).
CREATE TYPE "ApiTier" AS ENUM ('FREE', 'PRO', 'BUSINESS');

CREATE TABLE "ApiKey" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "tier" "ApiTier" NOT NULL DEFAULT 'FREE',
    "ownerEmail" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_active_idx" ON "ApiKey"("active");

ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
