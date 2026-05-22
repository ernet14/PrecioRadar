import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type CompactionResult =
  | { status: "skipped"; reason: string }
  | { status: "completed"; deleted: number; durationMs: number };

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Conserva un punto por día entre [30, 90) días atrás.
const STAGE_DAILY_START_DAYS = 30;
// Conserva un punto por semana entre [90, 365) días atrás.
const STAGE_WEEKLY_START_DAYS = 90;
// Conserva un punto por mes después de 365 días.
const STAGE_MONTHLY_START_DAYS = 365;

function daysAgo(days: number) {
  return new Date(Date.now() - days * ONE_DAY_MS);
}

async function recentlyCompacted(
  prisma: NonNullable<ReturnType<typeof getPrismaClient>>,
): Promise<boolean> {
  const lastJob = await prisma.scrapeJob.findFirst({
    where: { action: "compactHistory", status: "completed" },
    orderBy: { startedAt: "desc" },
  });

  if (!lastJob) return false;
  return Date.now() - lastJob.startedAt.getTime() < ONE_DAY_MS;
}

// Borra puntos en el rango [from, to) preservando, por bucket, la fila más antigua
// (ancla del período) más el mínimo y el máximo de precio.
async function compactRange(
  prisma: NonNullable<ReturnType<typeof getPrismaClient>>,
  bucket: "day" | "week" | "month",
  fromDate: Date,
  toDate: Date,
): Promise<number> {
  const dateTrunc =
    bucket === "day"
      ? "day"
      : bucket === "week"
        ? "week"
        : "month";

  // Por cada (offerId, bucket) preservamos 3 filas clave: la más antigua (ancla del
  // período), la de menor precio y la de mayor precio; borramos el resto. Así no se
  // pierde el mínimo/máximo histórico, necesario para el índice de precios y para el
  // veredicto de "precio más bajo de la historia" de la extensión.
  // Solo aplica a registros isDemo=false.
  const result = await prisma.$executeRawUnsafe(
    `
    WITH ranked AS (
      SELECT
        "id",
        ROW_NUMBER() OVER (
          PARTITION BY "offerId", DATE_TRUNC($1, "recordedAt")
          ORDER BY "recordedAt" ASC
        ) AS rn_time,
        ROW_NUMBER() OVER (
          PARTITION BY "offerId", DATE_TRUNC($1, "recordedAt")
          ORDER BY "price" ASC, "recordedAt" ASC
        ) AS rn_min,
        ROW_NUMBER() OVER (
          PARTITION BY "offerId", DATE_TRUNC($1, "recordedAt")
          ORDER BY "price" DESC, "recordedAt" ASC
        ) AS rn_max
      FROM "PriceHistory"
      WHERE "isDemo" = false
        AND "offerId" IS NOT NULL
        AND "recordedAt" >= $2::timestamptz
        AND "recordedAt" <  $3::timestamptz
    )
    DELETE FROM "PriceHistory" ph
    USING ranked r
    WHERE ph."id" = r."id"
      AND r.rn_time > 1
      AND r.rn_min > 1
      AND r.rn_max > 1
    `,
    dateTrunc,
    fromDate.toISOString(),
    toDate.toISOString(),
  );

  return Number(result ?? 0);
}

export async function compactPriceHistory(): Promise<CompactionResult> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return { status: "skipped", reason: "DATABASE_URL no configurado." };
  }

  if (await recentlyCompacted(prisma)) {
    return { status: "skipped", reason: "Compaction ya corrió en las últimas 24h." };
  }

  const jobStart = Date.now();
  const job = await prisma.scrapeJob.create({
    data: {
      provider: "internal",
      action: "compactHistory",
      status: "running",
    },
    select: { id: true },
  });

  try {
    const now = new Date();
    const dailyFrom = daysAgo(STAGE_WEEKLY_START_DAYS);
    const dailyTo = daysAgo(STAGE_DAILY_START_DAYS);
    const weeklyFrom = daysAgo(STAGE_MONTHLY_START_DAYS);
    const weeklyTo = daysAgo(STAGE_WEEKLY_START_DAYS);
    const monthlyFrom = new Date(0);
    const monthlyTo = daysAgo(STAGE_MONTHLY_START_DAYS);

    const dailyDeleted = await compactRange(prisma, "day", dailyFrom, dailyTo);
    const weeklyDeleted = await compactRange(prisma, "week", weeklyFrom, weeklyTo);
    const monthlyDeleted = await compactRange(prisma, "month", monthlyFrom, monthlyTo);

    const totalDeleted = dailyDeleted + weeklyDeleted + monthlyDeleted;
    const durationMs = Date.now() - jobStart;

    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        processed: totalDeleted,
        updated: totalDeleted,
        errors: 0,
        finishedAt: new Date(),
        durationMs,
        metadata: {
          dailyDeleted,
          weeklyDeleted,
          monthlyDeleted,
          completedAt: now.toISOString(),
        },
      },
    });

    return { status: "completed", deleted: totalDeleted, durationMs };
  } catch (error) {
    logger.error("Unable to compact price history.", { error });

    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: {
        status: "error",
        errors: 1,
        finishedAt: new Date(),
        durationMs: Date.now() - jobStart,
      },
    });

    return { status: "skipped", reason: "Error durante la compaction." };
  }
}
