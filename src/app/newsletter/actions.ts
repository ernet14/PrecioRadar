"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { getPrismaClient } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/seo/site";
import { recordAuditEvent } from "@/services/auditLogService";
import { sendNewsletterConfirmEmail } from "@/services/emailService";
import { track } from "@/services/analyticsService";
import { normalizeSegments } from "@/data/newsletterSegments";

const schema = z.object({
  email: z.string().email("Ingresá un email válido."),
});

type NewsletterState = {
  status: "idle" | "success" | "error" | "duplicate" | "already_confirmed";
  message: string;
};

function generateConfirmToken() {
  return randomBytes(32).toString("hex");
}

function buildConfirmUrl(token: string) {
  return `${getSiteUrl().replace(/\/+$/, "")}/api/newsletter/confirm?token=${encodeURIComponent(token)}`;
}

export async function subscribeToNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = schema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Email inválido." };
  }

  const email = parsed.data.email.toLowerCase();
  const segments = normalizeSegments(formData.getAll("segments").map(String));
  const source = (formData.get("source") as string | null)?.trim() || "web";
  const prisma = getPrismaClient();

  if (!prisma) {
    return {
      status: "success",
      message: "¡Gracias! Te enviamos un email para confirmar tu suscripción.",
    };
  }

  try {
    const existing = await prisma.newsletterSubscription.findUnique({ where: { email } });

    if (existing?.confirmed) {
      return {
        status: "already_confirmed",
        message: "Ya estás suscripto con ese email.",
      };
    }

    const token = generateConfirmToken();
    const confirmUrl = buildConfirmUrl(token);

    if (existing) {
      await prisma.newsletterSubscription.update({
        where: { email },
        data: { confirmToken: token, source, segments },
      });
    } else {
      await prisma.newsletterSubscription.create({
        data: { email, source, confirmToken: token, segments },
      });
    }

    void track({ name: "newsletter_subscribe", props: { source, segments } });

    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    await recordAuditEvent({
      actorEmail: email,
      event: "newsletter.subscribe",
      ip,
      resource: "newsletter",
      userAgent: hdrs.get("user-agent"),
    });

    const result = await sendNewsletterConfirmEmail({
      confirmUrl,
      recipientEmail: email,
    });

    if (result.status === "failed") {
      return {
        status: "error",
        message: "No pudimos enviar el email de confirmación. Probá de nuevo.",
      };
    }

    return {
      status: "success",
      message: "Revisá tu casilla y hacé click en el link para confirmar la suscripción.",
    };
  } catch {
    return { status: "error", message: "No pudimos registrar tu suscripción. Intentá de nuevo." };
  }
}

