-- Etapa 14: diversificación de afiliados.
-- Programa por defecto a nivel tienda y atribución de programa por click.

ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "affiliateProgram" TEXT DEFAULT 'mercadolibre';

ALTER TABLE "ClickTracking" ADD COLUMN IF NOT EXISTS "program" TEXT;

CREATE INDEX IF NOT EXISTS "ClickTracking_program_idx" ON "ClickTracking"("program");
