-- Etapa 16: votos comunitarios "¿esta oferta es real?" (👍/👎).

CREATE TABLE IF NOT EXISTS "ProductVote" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "productId" UUID         NOT NULL,
  "userId"    UUID         NOT NULL,
  "value"     INTEGER      NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductVote_productId_userId_key" ON "ProductVote"("productId", "userId");
CREATE INDEX IF NOT EXISTS "ProductVote_productId_idx" ON "ProductVote"("productId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductVote_productId_fkey') THEN
    ALTER TABLE "ProductVote"
      ADD CONSTRAINT "ProductVote_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductVote_userId_fkey') THEN
    ALTER TABLE "ProductVote"
      ADD CONSTRAINT "ProductVote_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- Lectura/escritura desde el backend (service_role bypassa RLS).
ALTER TABLE "ProductVote" ENABLE ROW LEVEL SECURITY;
