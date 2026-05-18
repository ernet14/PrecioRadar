import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getPrismaClient } from "@/lib/prisma";
import { recordAuditEvent } from "@/services/auditLogService";

const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/i);

const noStoreHeaders = { "Cache-Control": "no-store" };

export const dynamic = "force-dynamic";

function redirectWithStatus(origin: string, status: string) {
  const url = new URL("/newsletter/confirmacion", origin);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url, { headers: noStoreHeaders });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  const parsed = tokenSchema.safeParse(token);

  if (!parsed.success) {
    return redirectWithStatus(url.origin, "invalid");
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    return redirectWithStatus(url.origin, "unavailable");
  }

  try {
    const subscription = await prisma.newsletterSubscription.findUnique({
      where: { confirmToken: parsed.data },
    });

    if (!subscription) {
      return redirectWithStatus(url.origin, "not_found");
    }

    if (subscription.confirmed) {
      return redirectWithStatus(url.origin, "already_confirmed");
    }

    await prisma.newsletterSubscription.update({
      where: { id: subscription.id },
      data: {
        confirmed: true,
        confirmedAt: new Date(),
        confirmToken: null,
      },
    });

    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    await recordAuditEvent({
      actorEmail: subscription.email,
      event: "newsletter.confirm",
      ip,
      resource: "newsletter",
      userAgent: hdrs.get("user-agent"),
    });

    return redirectWithStatus(url.origin, "confirmed");
  } catch {
    return redirectWithStatus(url.origin, "error");
  }
}
