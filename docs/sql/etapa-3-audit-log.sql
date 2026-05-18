-- ETAPA 3 — AuditLog table (append-only)
-- Aplicar después de etapa-3-rls.sql en Supabase SQL editor.

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorId"    UUID,
  "actorEmail" TEXT,
  "event"      TEXT        NOT NULL,
  "resource"   TEXT,
  "resourceId" TEXT,
  "metadata"   JSONB,
  "ipHash"     TEXT,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "AuditLog_actorId_createdAt_idx"
  ON "AuditLog" ("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_event_createdAt_idx"
  ON "AuditLog" ("event", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx"
  ON "AuditLog" ("createdAt");

-- Append-only: bloqueamos UPDATE y DELETE incluso para el dueño de la tabla
-- en el rol postgres normal. service_role mantiene capacidad de admin si fuera
-- estrictamente necesario (purga retención), pero la regla por defecto es
-- "logs no se modifican".

CREATE OR REPLACE FUNCTION audit_log_block_mutations() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog es append-only: % no permitido', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_no_update ON "AuditLog";
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_block_mutations();

DROP TRIGGER IF EXISTS audit_log_no_delete ON "AuditLog";
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_block_mutations();

-- RLS: server-only (sin policies = deny-all para anon/auth, service role bypassa)
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
