ALTER TABLE "BankPromo"
  ADD COLUMN IF NOT EXISTS "categorySlug" TEXT,
  ADD COLUMN IF NOT EXISTS "commerceChannel" TEXT NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS "installments" INTEGER;

CREATE INDEX IF NOT EXISTS "BankPromo_storeSlug_active_idx" ON "BankPromo"("storeSlug", "active");
CREATE INDEX IF NOT EXISTS "BankPromo_categorySlug_active_idx" ON "BankPromo"("categorySlug", "active");
