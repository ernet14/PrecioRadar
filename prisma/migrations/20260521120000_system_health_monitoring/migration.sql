-- Auto-bloqueo temporal de tiendas (monitor): 403 repetidos -> blockedUntil.
ALTER TABLE "Store" ADD COLUMN "blockedUntil" TIMESTAMP(3);
ALTER TABLE "Store" ADD COLUMN "blockReason" TEXT;

-- Bitácora del bot de monitoreo (reportes diarios, health-watch, excepciones).
CREATE TABLE "SystemHealthLog" (
    "id" UUID NOT NULL,
    "reportType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metrics" JSONB,
    "detectedErrors" JSONB,
    "actionsTaken" JSONB,
    "recommendations" TEXT,
    "dedupeKey" TEXT,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemHealthLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SystemHealthLog_reportType_createdAt_idx" ON "SystemHealthLog"("reportType", "createdAt");
CREATE INDEX "SystemHealthLog_dedupeKey_createdAt_idx" ON "SystemHealthLog"("dedupeKey", "createdAt");
CREATE INDEX "SystemHealthLog_createdAt_idx" ON "SystemHealthLog"("createdAt");
