import { getPrismaClient } from "@/lib/prisma";

// Datos para el monitor en vivo del admin y el scorecard de catálogo.
// Solo lectura; no dispara acciones.

const SUCCESS_STATUSES = ["ok", "ready", "success", "completed"];

export type MonitorJob = {
  id: string;
  provider: string;
  action: string;
  status: string;
  processed: number;
  updated: number;
  errors: number;
  outliers: number;
  startedAt: Date;
  finishedAt: Date | null;
  durationMs: number | null;
};

export type MonitorEvent = {
  id: string;
  provider: string;
  action: string;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  storeName: string | null;
};

export type MonitorReport = {
  status: string;
  summary: string;
  recommendations: string | null;
  createdAt: Date;
  issues: { severity: string; title: string; detail: string }[];
} | null;

export type MonitorData = {
  generatedAt: string;
  running: boolean;
  lastJob: MonitorJob | null;
  recentJobs: MonitorJob[];
  priceUpdatesLastHour: number;
  suspicious: MonitorEvent[];
  normal: MonitorEvent[];
  latestReport: MonitorReport;
};

function parseIssues(
  detectedErrors: unknown,
): { severity: string; title: string; detail: string }[] {
  if (!Array.isArray(detectedErrors)) return [];
  return detectedErrors
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => ({
      severity: String(entry.severity ?? "warn"),
      title: String(entry.title ?? "Sin título"),
      detail: String(entry.detail ?? ""),
    }));
}

export async function getMonitorData(): Promise<MonitorData | null> {
  const prisma = getPrismaClient();
  if (!prisma) return null;

  const since24h = new Date(Date.now() - 24 * 3_600_000);
  const sinceHour = new Date(Date.now() - 3_600_000);

  const [recentJobs, priceUpdatesLastHour, suspiciousRows, normalRows, report] = await Promise.all([
    prisma.scrapeJob.findMany({
      orderBy: { startedAt: "desc" },
      take: 6,
      select: {
        id: true, provider: true, action: true, status: true, processed: true,
        updated: true, errors: true, outliers: true, startedAt: true, finishedAt: true, durationMs: true,
      },
    }),
    prisma.priceHistory.count({ where: { isDemo: false, recordedAt: { gte: sinceHour } } }),
    prisma.providerLog.findMany({
      where: {
        createdAt: { gte: since24h },
        OR: [
          { status: { notIn: SUCCESS_STATUSES } },
          { action: "cron.outlierDetected" },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, provider: true, action: true, status: true, errorMessage: true,
        createdAt: true, store: { select: { name: true } },
      },
    }),
    prisma.providerLog.findMany({
      where: {
        createdAt: { gte: since24h },
        status: { in: SUCCESS_STATUSES },
        action: { not: "cron.outlierDetected" },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true, provider: true, action: true, status: true, errorMessage: true,
        createdAt: true, store: { select: { name: true } },
      },
    }),
    prisma.systemHealthLog.findFirst({
      where: { reportType: "daily" },
      orderBy: { createdAt: "desc" },
      select: { status: true, summary: true, recommendations: true, createdAt: true, detectedErrors: true },
    }),
  ]);

  const toEvent = (row: (typeof suspiciousRows)[number]): MonitorEvent => ({
    id: row.id,
    provider: row.provider,
    action: row.action,
    status: row.status,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    storeName: row.store?.name ?? null,
  });

  const lastJob = recentJobs[0] ?? null;

  return {
    generatedAt: new Date().toISOString(),
    running: recentJobs.some((job) => job.status === "running" || job.status === "pending"),
    lastJob,
    recentJobs,
    priceUpdatesLastHour,
    suspicious: suspiciousRows.map(toEvent),
    normal: normalRows.map(toEvent),
    latestReport: report
      ? {
          status: report.status,
          summary: report.summary,
          recommendations: report.recommendations,
          createdAt: report.createdAt,
          issues: parseIssues(report.detectedErrors),
        }
      : null,
  };
}

export type CatalogScorecard = {
  realProducts: number;
  productsWithOffers: number;
  comparableProducts: number; // ofertas de >= 2 tiendas distintas
  singleStoreProducts: number; // solo 1 tienda (no comparables)
  activeOffers: number;
  productsWithoutOffers: number;
  productsWithoutImage: number;
  staleOffers: number;
  providerErrors24h: number;
  searches7d: number;
  clicks7d: number;
  affiliateClicks7d: number;
};

const OFFER_STALE_HOURS = 48;

export async function getCatalogScorecard(): Promise<CatalogScorecard | null> {
  const prisma = getPrismaClient();
  if (!prisma) return null;

  const since7d = new Date(Date.now() - 7 * 24 * 3_600_000);
  const staleBefore = new Date(Date.now() - OFFER_STALE_HOURS * 3_600_000);

  // Productos comparables = con ofertas disponibles de 2+ tiendas distintas.
  const comparableRows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT o."productId"
      FROM "ProductOffer" o
      JOIN "Product" p ON p.id = o."productId"
      WHERE o."isDemo" = false AND o.available = true AND p."deletedAt" IS NULL AND p."isDemo" = false
      GROUP BY o."productId"
      HAVING COUNT(DISTINCT o."storeId") >= 2
    ) t`;
  const comparableProducts = Number(comparableRows[0]?.count ?? 0);

  const [
    realProducts,
    productsWithOffers,
    activeOffers,
    productsWithoutImage,
    staleOffers,
    providerErrors24h,
    searches7d,
    clicks7d,
    affiliateClicks7d,
  ] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null, isDemo: false } }),
    prisma.product.count({
      where: { deletedAt: null, isDemo: false, offers: { some: { isDemo: false, available: true } } },
    }),
    prisma.productOffer.count({ where: { isDemo: false, available: true } }),
    prisma.product.count({ where: { deletedAt: null, isDemo: false, imageUrl: null } }),
    prisma.productOffer.count({
      where: { isDemo: false, OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: staleBefore } }] },
    }),
    prisma.providerLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 3_600_000) }, status: { notIn: SUCCESS_STATUSES } },
    }),
    prisma.searchLog.count({ where: { createdAt: { gte: since7d } } }),
    prisma.clickTracking.count({ where: { clickedAt: { gte: since7d } } }),
    prisma.clickTracking.count({ where: { isAffiliate: true, clickedAt: { gte: since7d } } }),
  ]);

  return {
    realProducts,
    productsWithOffers,
    comparableProducts,
    singleStoreProducts: Math.max(0, productsWithOffers - comparableProducts),
    activeOffers,
    productsWithoutOffers: Math.max(0, realProducts - productsWithOffers),
    productsWithoutImage,
    staleOffers,
    providerErrors24h,
    searches7d,
    clicks7d,
    affiliateClicks7d,
  };
}
