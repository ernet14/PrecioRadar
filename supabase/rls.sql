-- RLS policies for PrecioRadar
-- Aplicar en Supabase SQL Editor o como migración.
-- Nota: Prisma usa la conexión de service role (DATABASE_URL) y bypass RLS.
-- Estas políticas protegen acceso directo vía Supabase client (anon/user role).

-- ─── Habilitar RLS en tablas con datos de usuario ───────────────────────────

ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrackedProduct" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SearchLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClickTracking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductReport" ENABLE ROW LEVEL SECURITY;

-- Tablas de catálogo: solo lectura para todos, sin datos sensibles de usuario.
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Store" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceHistory" ENABLE ROW LEVEL SECURITY;

-- ─── Alert: solo el dueño puede leer/escribir sus propias alertas ────────────

CREATE POLICY "alert_owner_select" ON "Alert"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "alert_owner_insert" ON "Alert"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "alert_owner_update" ON "Alert"
  FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "alert_owner_delete" ON "Alert"
  FOR DELETE USING (auth.uid()::text = "userId");

-- ─── TrackedProduct ──────────────────────────────────────────────────────────

CREATE POLICY "tracked_owner_select" ON "TrackedProduct"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "tracked_owner_insert" ON "TrackedProduct"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "tracked_owner_delete" ON "TrackedProduct"
  FOR DELETE USING (auth.uid()::text = "userId");

-- ─── Notification ────────────────────────────────────────────────────────────

CREATE POLICY "notification_owner_select" ON "Notification"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "notification_owner_update" ON "Notification"
  FOR UPDATE USING (auth.uid()::text = "userId");

-- ─── SearchLog: el usuario ve sus propios logs; anon no ve nada ──────────────

CREATE POLICY "searchlog_owner_select" ON "SearchLog"
  FOR SELECT USING (auth.uid()::text = "userId");

-- ─── ClickTracking ───────────────────────────────────────────────────────────

CREATE POLICY "click_owner_select" ON "ClickTracking"
  FOR SELECT USING (auth.uid()::text = "userId");

-- ─── ProductReport: el usuario ve sus propios reportes ───────────────────────

CREATE POLICY "report_owner_select" ON "ProductReport"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "report_anon_insert" ON "ProductReport"
  FOR INSERT WITH CHECK (true);

-- ─── Catálogo: lectura pública ───────────────────────────────────────────────

CREATE POLICY "product_public_select" ON "Product"
  FOR SELECT USING (true);

CREATE POLICY "offer_public_select" ON "ProductOffer"
  FOR SELECT USING (true);

CREATE POLICY "store_public_select" ON "Store"
  FOR SELECT USING (true);

CREATE POLICY "category_public_select" ON "Category"
  FOR SELECT USING (true);

CREATE POLICY "price_history_public_select" ON "PriceHistory"
  FOR SELECT USING (true);
