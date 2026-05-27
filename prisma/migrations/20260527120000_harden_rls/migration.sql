-- Hardening RLS global: la app accede a datos de negocio desde el backend con
-- service role / conexión server-side. El cliente público no debe leer ni
-- escribir tablas de aplicación directamente con anon/authenticated.

ALTER TABLE IF EXISTS "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Store" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ProductOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "PriceHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ProductImportDraft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "TrackedProduct" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ClickTracking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ProductReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ProductVote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AffiliateLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SearchLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ProviderLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ScrapeJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "MercadoLibreCache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ProductReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "NewsletterSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AnalyticsEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "MercadoLibreAuth" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SystemHealthLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "DataRadarSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "BankPromo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "BankPromoBotSource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ApiKey" ENABLE ROW LEVEL SECURITY;

-- Remueve policies históricas que permitían acceso directo desde Supabase anon/auth.
DROP POLICY IF EXISTS "alert_owner" ON "Alert";
DROP POLICY IF EXISTS "notification_owner" ON "Notification";
DROP POLICY IF EXISTS "tracked_product_owner" ON "TrackedProduct";
DROP POLICY IF EXISTS user_self_select ON "User";
DROP POLICY IF EXISTS user_self_update ON "User";
DROP POLICY IF EXISTS alert_owner_all ON "Alert";
DROP POLICY IF EXISTS tracked_product_owner_all ON "TrackedProduct";
DROP POLICY IF EXISTS notification_owner_select ON "Notification";
DROP POLICY IF EXISTS notification_owner_update ON "Notification";
DROP POLICY IF EXISTS click_tracking_public_insert ON "ClickTracking";
DROP POLICY IF EXISTS click_tracking_owner_select ON "ClickTracking";
DROP POLICY IF EXISTS search_log_public_insert ON "SearchLog";
DROP POLICY IF EXISTS search_log_owner_select ON "SearchLog";
DROP POLICY IF EXISTS product_report_public_insert ON "ProductReport";
DROP POLICY IF EXISTS product_report_owner_select ON "ProductReport";
DROP POLICY IF EXISTS product_public_select ON "Product";
DROP POLICY IF EXISTS product_offer_public_select ON "ProductOffer";
DROP POLICY IF EXISTS store_public_select ON "Store";
DROP POLICY IF EXISTS category_public_select ON "Category";
DROP POLICY IF EXISTS price_history_public_select ON "PriceHistory";
DROP POLICY IF EXISTS bank_promo_public_select ON "BankPromo";
DROP POLICY IF EXISTS affiliate_link_public_select ON "AffiliateLink";
