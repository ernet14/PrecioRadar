-- ETAPA 5 — Historial real persistido
-- Aplicar manualmente en Supabase SQL editor.

------------------------------------------------------------
-- 1. deletedAt soft-delete en Product, Store, Category
------------------------------------------------------------
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

ALTER TABLE "Store"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

ALTER TABLE "Category"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

------------------------------------------------------------
-- 2. Índice compuesto para listar ofertas activas
------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "ProductOffer_productId_storeId_available_idx"
  ON "ProductOffer" ("productId", "storeId", "available");

------------------------------------------------------------
-- 3. ScrapeJob: tracking estructurado de corridas del cron
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ScrapeJob" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider"   TEXT        NOT NULL,
  "action"     TEXT        NOT NULL,
  "status"     TEXT        NOT NULL DEFAULT 'running',
  "processed"  INTEGER     NOT NULL DEFAULT 0,
  "updated"    INTEGER     NOT NULL DEFAULT 0,
  "errors"     INTEGER     NOT NULL DEFAULT 0,
  "outliers"   INTEGER     NOT NULL DEFAULT 0,
  "startedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "finishedAt" TIMESTAMPTZ,
  "durationMs" INTEGER,
  "metadata"   JSONB
);

CREATE INDEX IF NOT EXISTS "ScrapeJob_provider_action_startedAt_idx"
  ON "ScrapeJob" ("provider", "action", "startedAt");
CREATE INDEX IF NOT EXISTS "ScrapeJob_status_idx"
  ON "ScrapeJob" ("status");
CREATE INDEX IF NOT EXISTS "ScrapeJob_startedAt_idx"
  ON "ScrapeJob" ("startedAt");

-- RLS: server-only (no policies → deny-all anon/auth)
ALTER TABLE "ScrapeJob" ENABLE ROW LEVEL SECURITY;
