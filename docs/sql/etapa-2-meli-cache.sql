-- ETAPA 2 — MercadoLibre cache + latencia en ProviderLog
-- Aplicar manualmente en Supabase SQL editor.
-- Tras correrlo: `npx prisma migrate resolve --applied 0001_etapa2_meli_cache`
-- (o el id que asigne Prisma) si registramos migration en CI. Por ahora,
-- el repo usa schema.prisma como source of truth y este archivo queda
-- como track manual.

ALTER TABLE "ProviderLog"
  ADD COLUMN IF NOT EXISTS "latencyMs" INTEGER;

CREATE TABLE IF NOT EXISTS "MercadoLibreCache" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "cacheKey"  TEXT        NOT NULL,
  "endpoint"  TEXT        NOT NULL,
  "body"      JSONB       NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "MercadoLibreCache_cacheKey_key"
  ON "MercadoLibreCache" ("cacheKey");

CREATE INDEX IF NOT EXISTS "MercadoLibreCache_endpoint_idx"
  ON "MercadoLibreCache" ("endpoint");

CREATE INDEX IF NOT EXISTS "MercadoLibreCache_expiresAt_idx"
  ON "MercadoLibreCache" ("expiresAt");

-- Trigger para mantener updatedAt automáticamente.
CREATE OR REPLACE FUNCTION set_meli_cache_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meli_cache_updated_at ON "MercadoLibreCache";
CREATE TRIGGER meli_cache_updated_at
  BEFORE UPDATE ON "MercadoLibreCache"
  FOR EACH ROW EXECUTE FUNCTION set_meli_cache_updated_at();
