-- ETAPA 4 — Compliance legal (User soft-delete)
-- Aplicar manualmente en Supabase SQL editor.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- Para reforzar RLS de ETAPA 3: que un usuario "borrado" no pueda leerse a sí mismo.
-- Las policies actuales sobre User chequean auth.uid() = id; agregamos el filtro de
-- deletedAt IS NULL para que la cuenta efectivamente desaparezca de su propia vista.

DROP POLICY IF EXISTS user_self_select ON "User";
CREATE POLICY user_self_select ON "User"
  FOR SELECT TO authenticated
  USING (auth.uid() = "id" AND "deletedAt" IS NULL);

DROP POLICY IF EXISTS user_self_update ON "User";
CREATE POLICY user_self_update ON "User"
  FOR UPDATE TO authenticated
  USING (auth.uid() = "id" AND "deletedAt" IS NULL)
  WITH CHECK (auth.uid() = "id");
