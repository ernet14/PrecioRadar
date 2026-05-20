import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// Etapa 9 — stream genérico de eventos de producto. Fire-and-forget: nunca
// bloquea ni rompe el flujo principal. No-op si no hay base disponible.

export type TrackEventInput = {
  name: string;
  props?: Record<string, unknown>;
  path?: string | null;
  userId?: string | null;
};

export async function track({ name, props, path, userId }: TrackEventInput): Promise<void> {
  const prisma = getPrismaClient();

  if (!prisma) return;

  try {
    await prisma.analyticsEvent.create({
      data: {
        name,
        path: path ?? null,
        props: props ? (props as object) : undefined,
        userId: userId ?? null,
      },
    });
  } catch (error) {
    logger.error(`Unable to record analytics event: ${name}`, { error });
  }
}

export type DailyEventCount = { name: string; count: number };

/** Conteo de eventos por nombre desde el inicio del día UTC. */
export async function getTodayEventCounts(): Promise<DailyEventCount[] | null> {
  const prisma = getPrismaClient();

  if (!prisma) return null;

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  try {
    const groups = await prisma.analyticsEvent.groupBy({
      by: ["name"],
      where: { createdAt: { gte: startOfDay } },
      _count: { _all: true },
    });

    return groups
      .map((group) => ({ name: group.name, count: group._count._all }))
      .sort((left, right) => right.count - left.count);
  } catch {
    return null;
  }
}
