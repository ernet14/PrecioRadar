CREATE TABLE IF NOT EXISTS "BankPromoBotSource" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "url" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastCheckedAt" TIMESTAMP(3),
  "lastStatus" TEXT,
  "lastMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BankPromoBotSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BankPromoBotSource_url_key" ON "BankPromoBotSource"("url");
CREATE INDEX IF NOT EXISTS "BankPromoBotSource_active_updatedAt_idx" ON "BankPromoBotSource"("active", "updatedAt");
