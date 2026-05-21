-- Etapa 16: reseñas de producto (rating + comentario, con moderación y Schema.org).

CREATE TABLE IF NOT EXISTS "ProductReview" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "productId" UUID         NOT NULL,
  "userId"    UUID         NOT NULL,
  "rating"    INTEGER      NOT NULL,
  "body"      TEXT         NOT NULL,
  "status"    TEXT         NOT NULL DEFAULT 'APPROVED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductReview_productId_userId_key" ON "ProductReview"("productId", "userId");
CREATE INDEX IF NOT EXISTS "ProductReview_productId_status_idx" ON "ProductReview"("productId", "status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductReview_productId_fkey') THEN
    ALTER TABLE "ProductReview"
      ADD CONSTRAINT "ProductReview_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductReview_userId_fkey') THEN
    ALTER TABLE "ProductReview"
      ADD CONSTRAINT "ProductReview_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

ALTER TABLE "ProductReview" ENABLE ROW LEVEL SECURITY;
