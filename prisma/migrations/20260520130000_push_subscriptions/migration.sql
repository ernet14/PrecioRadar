-- Etapa 15: Web Push. Suscripciones push por dispositivo (opcionalmente por usuario).

CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "userId"    UUID,
  "endpoint"  TEXT         NOT NULL,
  "p256dh"    TEXT         NOT NULL,
  "auth"      TEXT         NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PushSubscription_userId_fkey'
  ) THEN
    ALTER TABLE "PushSubscription"
      ADD CONSTRAINT "PushSubscription_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

-- Escritura/lectura solo desde el backend (service_role bypassa RLS). Sin policies = deny all para anon/authenticated.
ALTER TABLE "PushSubscription" ENABLE ROW LEVEL SECURITY;
