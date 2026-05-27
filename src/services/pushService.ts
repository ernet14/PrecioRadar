import webpush from "web-push";
import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { track } from "@/services/analyticsService";

// Etapa 15 — Web Push. Envío y persistencia de suscripciones push.
// Todo es defensivo: sin claves VAPID configuradas, el envío es un no-op.

let vapidConfigured = false;

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim(),
  );
}

function ensureVapid(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:soporte@precio-radar.com";

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export type WebPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type SavePushResult = "saved" | "database_unavailable" | "error";

export async function savePushSubscription({
  subscription,
  userId,
  userAgent,
}: {
  subscription: WebPushSubscription;
  userId?: string | null;
  userAgent?: string | null;
}): Promise<SavePushResult> {
  const prisma = getPrismaClient();

  if (!prisma) return "database_unavailable";

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: userId ?? null,
        userAgent: userAgent ?? null,
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: userId ?? null,
        userAgent: userAgent ?? null,
      },
    });

    void track({ name: "push_subscribe", userId: userId ?? null });

    return "saved";
  } catch (error) {
    logger.error("Unable to save push subscription.", { error });
    return "error";
  }
}

export async function deletePushSubscription(
  endpoint: string,
  userId: string,
): Promise<boolean> {
  const prisma = getPrismaClient();

  if (!prisma) return false;

  try {
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
    return true;
  } catch (error) {
    logger.error("Unable to delete push subscription.", { error });
    return false;
  }
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; skipped?: boolean }> {
  if (!ensureVapid()) return { sent: 0, skipped: true };

  const prisma = getPrismaClient();

  if (!prisma) return { sent: 0 };

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  const body = JSON.stringify(payload);
  let sent = 0;

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        body,
      );
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      // 404/410: la suscripción expiró o fue revocada → limpiarla.
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription
          .deleteMany({ where: { endpoint: subscription.endpoint } })
          .catch(() => {});
      } else {
        logger.error("Unable to send push notification.", { error });
      }
    }
  }

  return { sent };
}
