-- Selección semanal de productos para la home (Detectadas por PrecioRadar).
-- Generada cada lunes por cron /api/internal/refresh-weekly-featured.
-- Campos de display denormalizados (name, imageUrl, price, storeName) para evitar joins en lectura.

CREATE TABLE IF NOT EXISTS "WeeklyFeaturedProduct" (
  "id"        UUID          NOT NULL DEFAULT gen_random_uuid(),
  "weekStart" DATE          NOT NULL,
  "slug"      TEXT          NOT NULL,
  "productId" UUID,
  "rank"      INTEGER       NOT NULL,
  "score"     FLOAT         NOT NULL DEFAULT 0,
  "reason"    TEXT          NOT NULL DEFAULT '',
  "isDemo"    BOOLEAN       NOT NULL DEFAULT false,
  "pinned"    BOOLEAN       NOT NULL DEFAULT false,
  "name"      TEXT          NOT NULL DEFAULT '',
  "imageUrl"  TEXT,
  "price"     DECIMAL(14,2) NOT NULL DEFAULT 0,
  "storeName" TEXT          NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WeeklyFeaturedProduct_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WeeklyFeaturedProduct_weekStart_slug_key" UNIQUE ("weekStart", "slug")
);

CREATE INDEX IF NOT EXISTS "WeeklyFeaturedProduct_weekStart_rank_idx"
  ON "WeeklyFeaturedProduct"("weekStart", "rank");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WeeklyFeaturedProduct_productId_fkey'
  ) THEN
    ALTER TABLE "WeeklyFeaturedProduct"
      ADD CONSTRAINT "WeeklyFeaturedProduct_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

ALTER TABLE "WeeklyFeaturedProduct" ENABLE ROW LEVEL SECURITY;
