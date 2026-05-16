-- Migración: Decimal(12,2) → Decimal(14,2)
-- Ejecutar en Supabase SQL Editor antes del próximo deploy.
-- Permite precios hasta $999,999,999,999.99 ARS.

ALTER TABLE "ProductOffer" ALTER COLUMN "price" TYPE DECIMAL(14,2);
ALTER TABLE "PriceHistory" ALTER COLUMN "price" TYPE DECIMAL(14,2);
ALTER TABLE "Alert" ALTER COLUMN "targetPrice" TYPE DECIMAL(14,2);
