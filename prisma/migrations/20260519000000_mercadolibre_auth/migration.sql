-- MercadoLibre OAuth Authorization Code flow: tabla singleton para tokens
-- de la cuenta MeLi conectada por el founder. RLS sin policies = deny-all
-- para anon/authenticated. service_role (server) bypassea RLS y es el unico
-- que escribe/lee desde getMercadoLibreToken/exchangeCodeForTokens.

CREATE TABLE IF NOT EXISTS "MercadoLibreAuth" (
  "id"           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "singletonKey" TEXT         NOT NULL DEFAULT 'default',
  "mlUserId"     TEXT         NOT NULL,
  "accessToken"  TEXT         NOT NULL,
  "refreshToken" TEXT         NOT NULL,
  "scope"        TEXT,
  "expiresAt"    TIMESTAMP(3) NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "MercadoLibreAuth_singletonKey_key"
  ON "MercadoLibreAuth" ("singletonKey");

ALTER TABLE "MercadoLibreAuth" ENABLE ROW LEVEL SECURITY;
