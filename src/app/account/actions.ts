"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getPrismaClient } from "@/lib/prisma";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/services/auditLogService";

const REQUIRED_CONFIRMATION = "ELIMINAR";

export async function deleteAccountAction(formData: FormData) {
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (confirmation !== REQUIRED_CONFIRMATION) {
    redirect("/dashboard?account=invalid-confirmation");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    redirect("/dashboard?account=unavailable");
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = hdrs.get("user-agent");

  try {
    await prisma.$transaction([
      prisma.alert.deleteMany({ where: { userId: user.id } }),
      prisma.trackedProduct.deleteMany({ where: { userId: user.id } }),
      prisma.notification.deleteMany({ where: { userId: user.id } }),
      prisma.clickTracking.deleteMany({ where: { userId: user.id } }),
      prisma.searchLog.deleteMany({ where: { userId: user.id } }),
      prisma.productReport.updateMany({
        where: { userId: user.id },
        data: { userId: null },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { deletedAt: new Date(), email: `deleted-${user.id}@precioradar.invalid`, name: null },
      }),
    ]);

    await recordAuditEvent({
      actorEmail: user.email ?? null,
      actorId: user.id,
      event: "account.delete",
      ip,
      resource: "user",
      resourceId: user.id,
      userAgent,
    });
  } catch (error) {
    console.error("Unable to delete account.", error);
    redirect("/dashboard?account=error");
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out failed after account deletion.", error);
    }
  }

  redirect("/?account=deleted");
}
