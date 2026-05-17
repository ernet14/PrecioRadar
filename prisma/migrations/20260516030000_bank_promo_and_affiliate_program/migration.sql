-- Add program field to AffiliateLink
ALTER TABLE "AffiliateLink" ADD COLUMN IF NOT EXISTS "program" TEXT DEFAULT 'mercadolibre';

-- Create BankPromo table
CREATE TABLE IF NOT EXISTS "BankPromo" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "entity"      TEXT        NOT NULL,
  "entitySlug"  TEXT        NOT NULL,
  "dayOfWeek"   INTEGER[]   NOT NULL DEFAULT '{}',
  "discountPct" INTEGER     NOT NULL,
  "promoType"   TEXT        NOT NULL DEFAULT 'percentage',
  "maxAmount"   INTEGER,
  "storeSlug"   TEXT,
  "paymentType" TEXT        NOT NULL DEFAULT 'cualquiera',
  "validFrom"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil"  TIMESTAMP(3),
  "sourceUrl"   TEXT,
  "active"      BOOLEAN     NOT NULL DEFAULT true,
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BankPromo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BankPromo_entitySlug_active_idx" ON "BankPromo"("entitySlug", "active");
CREATE INDEX IF NOT EXISTS "BankPromo_active_idx" ON "BankPromo"("active");
