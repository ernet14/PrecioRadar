CREATE TABLE IF NOT EXISTS "ProductImportDraft" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "originalUrl" TEXT NOT NULL,
  "normalizedUrl" TEXT,
  "sourceDomain" TEXT,
  "detectedStoreSlug" TEXT,
  "detectedStoreName" TEXT,
  "shortUrl" BOOLEAN NOT NULL DEFAULT false,
  "unexpandedShortUrl" BOOLEAN NOT NULL DEFAULT false,
  "suggestedSlug" TEXT,
  "suggestedTitle" TEXT,
  "suggestedCategorySlug" TEXT,
  "productName" TEXT,
  "storeSlug" TEXT,
  "storeName" TEXT,
  "categorySlug" TEXT,
  "currentPrice" DECIMAL(14, 2),
  "previousPrice" DECIMAL(14, 2),
  "imageUrl" TEXT,
  "externalUrl" TEXT,
  "affiliateUrl" TEXT,
  "shortDescription" TEXT,
  "fieldSources" JSONB,
  "publishedProductId" UUID,
  "publishedOfferId" UUID,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductImportDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductImportDraft_status_createdAt_idx" ON "ProductImportDraft"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ProductImportDraft_createdAt_idx" ON "ProductImportDraft"("createdAt");
CREATE INDEX IF NOT EXISTS "ProductImportDraft_storeSlug_idx" ON "ProductImportDraft"("storeSlug");
