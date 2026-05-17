ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alert_owner" ON "Alert";
CREATE POLICY "alert_owner" ON "Alert"
  USING (auth.uid() = "userId"::uuid);


ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_owner" ON "Notification";
CREATE POLICY "notification_owner" ON "Notification"
  USING (auth.uid() = "userId"::uuid);


ALTER TABLE "TrackedProduct" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tracked_product_owner" ON "TrackedProduct";
CREATE POLICY "tracked_product_owner" ON "TrackedProduct"
  USING (auth.uid() = "userId"::uuid);