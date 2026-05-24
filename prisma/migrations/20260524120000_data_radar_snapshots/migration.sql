CREATE TABLE IF NOT EXISTS "DataRadarSnapshot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source" TEXT NOT NULL DEFAULT 'bna',
  "scope" TEXT NOT NULL,
  "categorySlug" TEXT,
  "snapshotDate" DATE NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL,
  "priceBaseDate" DATE,
  "priceLatestDate" DATE,
  "priceDays" INTEGER NOT NULL DEFAULT 0,
  "productsTracked" INTEGER NOT NULL DEFAULT 0,
  "priceLatestIndex" DOUBLE PRECISION,
  "priceTotalChangePct" DOUBLE PRECISION,
  "fxFromDate" DATE,
  "fxToDate" DATE,
  "fxRates" INTEGER NOT NULL DEFAULT 0,
  "fxCarried" INTEGER NOT NULL DEFAULT 0,
  "betaLag0" DOUBLE PRECISION,
  "correlationLag0" DOUBLE PRECISION,
  "payload" JSONB NOT NULL,

  CONSTRAINT "DataRadarSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DataRadarSnapshot_source_scope_snapshotDate_key"
  ON "DataRadarSnapshot"("source", "scope", "snapshotDate");

CREATE INDEX IF NOT EXISTS "DataRadarSnapshot_source_snapshotDate_idx"
  ON "DataRadarSnapshot"("source", "snapshotDate");

CREATE INDEX IF NOT EXISTS "DataRadarSnapshot_scope_snapshotDate_idx"
  ON "DataRadarSnapshot"("scope", "snapshotDate");

CREATE INDEX IF NOT EXISTS "DataRadarSnapshot_status_snapshotDate_idx"
  ON "DataRadarSnapshot"("status", "snapshotDate");
