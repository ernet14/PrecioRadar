"use server";

import { getPrismaClient } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Ingresá un email válido."),
});

type NewsletterState = {
  status: "idle" | "success" | "error" | "duplicate";
  message: string;
};

export async function subscribeToNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = schema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Email inválido." };
  }

  const { email } = parsed.data;
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "success", message: "¡Gracias! Te avisamos cuando tengamos novedades." };
  }

  try {
    const existing = await prisma.newsletterSubscription.findUnique({ where: { email } });

    if (existing) {
      return {
        status: "duplicate",
        message: "Ya estás suscripto con ese email.",
      };
    }

    await prisma.newsletterSubscription.create({
      data: { email, source: "web" },
    });

    return {
      status: "success",
      message: "¡Suscripción confirmada! Te avisamos con las mejores ofertas.",
    };
  } catch {
    return { status: "error", message: "No pudimos registrar tu suscripción. Intentá de nuevo." };
  }
}
