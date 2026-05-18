import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getPrismaClient } from "@/lib/prisma";
import { rateLimit } from "@/lib/ratelimit";
import { recordAuditEvent } from "@/services/auditLogService";

const noStoreHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

export const dynamic = "force-dynamic";

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: { ...noStoreHeaders, ...extraHeaders },
    status,
  });
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";

  const { success } = await rateLimit("login", ip);
  if (!success) {
    return jsonResponse({ error: "rate_limited" }, 429);
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    return jsonResponse({ error: "database_unavailable" }, 503);
  }

  try {
    const [
      profile,
      alerts,
      trackedProducts,
      notifications,
      productReports,
      searchLogs,
      clickTracking,
    ] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.id } }),
      prisma.alert.findMany({ where: { userId: user.id } }),
      prisma.trackedProduct.findMany({ where: { userId: user.id } }),
      prisma.notification.findMany({ where: { userId: user.id } }),
      prisma.productReport.findMany({ where: { userId: user.id } }),
      prisma.searchLog.findMany({ where: { userId: user.id } }),
      prisma.clickTracking.findMany({ where: { userId: user.id } }),
    ]);

    await recordAuditEvent({
      actorEmail: user.email ?? null,
      actorId: user.id,
      event: "data_export.request",
      ip,
      resource: "user",
      resourceId: user.id,
      userAgent: hdrs.get("user-agent"),
    });

    const filename = `precioradar-data-export-${user.id}-${Date.now()}.json`;

    return jsonResponse(
      {
        generatedAt: new Date().toISOString(),
        user: profile,
        alerts,
        trackedProducts,
        notifications,
        productReports,
        searchLogs,
        clickTracking,
      },
      200,
      {
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    );
  } catch (error) {
    console.error("Unable to export user data.", error);
    return jsonResponse({ error: "export_failed" }, 500);
  }
}
