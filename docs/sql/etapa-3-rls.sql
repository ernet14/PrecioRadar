-- ETAPA 3 — Row Level Security en Supabase
-- Aplicar manualmente en Supabase SQL editor.
--
-- Estrategia general:
--   * Habilitar RLS en todas las tablas con datos. Sin policies → deny-all para anon/auth.
--   * Service role (DATABASE_URL del backend, supabase service_role key) bypassa RLS:
--     el backend mantiene acceso completo a través de Prisma sin cambios.
--   * Tablas de catálogo público (Product/Store/Category/PriceHistory/BankPromo)
--     reciben policy de SELECT abierta para que un eventual fetch desde el cliente
--     anon SDK siga funcionando.
--   * Tablas con userId requieren auth.uid() = userId para SELECT/UPDATE/DELETE
--     desde clientes autenticados.
--   * Tablas de logs (ClickTracking, SearchLog, ProductReport) aceptan INSERT
--     anónimo (con userId = NULL) pero solo el dueño o service_role puede leer.
--   * NewsletterSubscription, ProviderLog, MercadoLibreCache, AuditLog son
--     server-only: deny-all sin policy explícita.
--
-- Después de correr este script, validar desde dos cuentas distintas que el SDK anon
-- solo puede leer las propias alertas/tracked products/notificaciones.

------------------------------------------------------------
-- USER
------------------------------------------------------------
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_self_select ON "User";
CREATE POLICY user_self_select ON "User"
  FOR SELECT TO authenticated
  USING (auth.uid() = "id");

DROP POLICY IF EXISTS user_self_update ON "User";
CREATE POLICY user_self_update ON "User"
  FOR UPDATE TO authenticated
  USING (auth.uid() = "id")
  WITH CHECK (auth.uid() = "id");

------------------------------------------------------------
-- ALERT
------------------------------------------------------------
ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alert_owner_all ON "Alert";
CREATE POLICY alert_owner_all ON "Alert"
  FOR ALL TO authenticated
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

------------------------------------------------------------
-- TRACKED PRODUCT
------------------------------------------------------------
ALTER TABLE "TrackedProduct" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tracked_product_owner_all ON "TrackedProduct";
CREATE POLICY tracked_product_owner_all ON "TrackedProduct"
  FOR ALL TO authenticated
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

------------------------------------------------------------
-- NOTIFICATION
------------------------------------------------------------
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_owner_select ON "Notification";
CREATE POLICY notification_owner_select ON "Notification"
  FOR SELECT TO authenticated
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS notification_owner_update ON "Notification";
CREATE POLICY notification_owner_update ON "Notification"
  FOR UPDATE TO authenticated
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

------------------------------------------------------------
-- CLICK TRACKING (insert público, lectura solo del propio user)
------------------------------------------------------------
ALTER TABLE "ClickTracking" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS click_tracking_public_insert ON "ClickTracking";
CREATE POLICY click_tracking_public_insert ON "ClickTracking"
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    "userId" IS NULL OR auth.uid() = "userId"
  );

DROP POLICY IF EXISTS click_tracking_owner_select ON "ClickTracking";
CREATE POLICY click_tracking_owner_select ON "ClickTracking"
  FOR SELECT TO authenticated
  USING (auth.uid() = "userId");

------------------------------------------------------------
-- SEARCH LOG (insert público anónimo o autenticado)
------------------------------------------------------------
ALTER TABLE "SearchLog" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS search_log_public_insert ON "SearchLog";
CREATE POLICY search_log_public_insert ON "SearchLog"
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    "userId" IS NULL OR auth.uid() = "userId"
  );

DROP POLICY IF EXISTS search_log_owner_select ON "SearchLog";
CREATE POLICY search_log_owner_select ON "SearchLog"
  FOR SELECT TO authenticated
  USING (auth.uid() = "userId");

------------------------------------------------------------
-- PRODUCT REPORT
------------------------------------------------------------
ALTER TABLE "ProductReport" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_report_public_insert ON "ProductReport";
CREATE POLICY product_report_public_insert ON "ProductReport"
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    "userId" IS NULL OR auth.uid() = "userId"
  );

DROP POLICY IF EXISTS product_report_owner_select ON "ProductReport";
CREATE POLICY product_report_owner_select ON "ProductReport"
  FOR SELECT TO authenticated
  USING (auth.uid() = "userId");

------------------------------------------------------------
-- NEWSLETTER SUBSCRIPTION (server-only: ningún access desde anon/auth)
------------------------------------------------------------
ALTER TABLE "NewsletterSubscription" ENABLE ROW LEVEL SECURITY;
-- Sin policies → deny-all para anon y authenticated. Service role conserva acceso.

------------------------------------------------------------
-- CATÁLOGO PÚBLICO (lectura abierta)
------------------------------------------------------------
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_public_select ON "Product";
CREATE POLICY product_public_select ON "Product"
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE "ProductOffer" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_offer_public_select ON "ProductOffer";
CREATE POLICY product_offer_public_select ON "ProductOffer"
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE "Store" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS store_public_select ON "Store";
CREATE POLICY store_public_select ON "Store"
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS category_public_select ON "Category";
CREATE POLICY category_public_select ON "Category"
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE "PriceHistory" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS price_history_public_select ON "PriceHistory";
CREATE POLICY price_history_public_select ON "PriceHistory"
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE "BankPromo" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_promo_public_select ON "BankPromo";
CREATE POLICY bank_promo_public_select ON "BankPromo"
  FOR SELECT TO anon, authenticated USING ("active" = true);

ALTER TABLE "AffiliateLink" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS affiliate_link_public_select ON "AffiliateLink";
CREATE POLICY affiliate_link_public_select ON "AffiliateLink"
  FOR SELECT TO anon, authenticated USING ("active" = true);

------------------------------------------------------------
-- SERVER-ONLY (ningún access desde anon/auth)
------------------------------------------------------------
ALTER TABLE "ProviderLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MercadoLibreCache" ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- VERIFICACIÓN POSTERIOR
------------------------------------------------------------
-- Después de correr todo el script, ejecutá:
--
-- SELECT relname, relrowsecurity
-- FROM pg_class
-- WHERE relkind = 'r'
--   AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
-- ORDER BY relname;
--
-- Esperamos relrowsecurity = true en cada tabla listada arriba.
