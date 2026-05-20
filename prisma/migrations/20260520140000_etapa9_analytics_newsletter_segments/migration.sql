-- Etapa 9: segmentación de newsletter + tabla de eventos de analítica.

-- Tarea 3: cohortes de newsletter.
ALTER TABLE "NewsletterSubscription"
  ADD COLUMN IF NOT EXISTS "segments" TEXT[] NOT NULL DEFAULT '{}';

-- Tarea 9: stream genérico de eventos de producto.
CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "name"      TEXT         NOT NULL,
  "path"      TEXT,
  "props"     JSONB,
  "userId"    UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- Escritura solo desde el backend (service_role bypassa RLS).
ALTER TABLE "AnalyticsEvent" ENABLE ROW LEVEL SECURITY;
