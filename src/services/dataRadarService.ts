import { mvpCategoryDescriptors } from "@/data/categories";
import { getPrismaClient } from "@/lib/prisma";
import { fetchBnaDollarSeries, type BnaDollarSeriesResult } from "@/services/bnaDollarService";
import { computePassThrough, type PassThroughResult } from "@/services/passThroughService";
import { computePriceIndex, type PriceIndexResult } from "@/services/priceIndexService";

const DEFAULT_LAGS = [0, 1, 3, 7, 14];

export type DataRadarResult = {
  fx: BnaDollarSeriesResult;
  from: string;
  lags: number[];
  passThrough: PassThroughResult;
  source: "bna";
  to: string;
};

export type DataRadarScopeResult = {
  categorySlug: string | null;
  index: PriceIndexResult;
  label: string;
  radar: DataRadarResult | null;
};

export type DataRadarRunResult = {
  generatedAt: string;
  scopes: DataRadarScopeResult[];
  source: "bna";
  status: "ready" | "no_fx_data" | "no_price_history";
};

export type DataRadarPersistenceResult =
  | { snapshotDate: string; snapshots: number; status: "stored" }
  | { status: "database_unavailable" };

export type DataRadarSnapshotSummary = {
  betaLag0: number | null;
  categorySlug: string | null;
  correlationLag0: number | null;
  fxCarried: number;
  fxRates: number;
  generatedAt: string;
  priceDays: number;
  priceLatestIndex: number | null;
  priceTotalChangePct: number | null;
  productsTracked: number;
  scope: string;
  snapshotDate: string;
  source: string;
  status: string;
};

function addDays(date: string, days: number) {
  const ms = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function nullableDate(value: string | null | undefined) {
  return value ? dateOnly(value) : null;
}

function minIsoDate(dates: string[]) {
  return dates.reduce((min, date) => (date < min ? date : min));
}

function maxIsoDate(dates: string[]) {
  return dates.reduce((max, date) => (date > max ? date : max));
}

function computeBnaDataRadarWithFx(
  priceIndex: PriceIndexResult,
  fx: BnaDollarSeriesResult,
  from: string,
  lags: number[],
): DataRadarResult | null {
  if (!priceIndex.baseDate || !priceIndex.latestDate || priceIndex.points.length === 0) {
    return null;
  }

  const passThrough = computePassThrough(
    priceIndex,
    fx.rates.map((rate) => ({ date: rate.date, rate: rate.sell })),
    lags,
  );

  return {
    fx,
    from,
    lags,
    passThrough,
    source: "bna",
    to: priceIndex.latestDate,
  };
}

export async function computeBnaDataRadar(
  priceIndex: PriceIndexResult,
  opts?: { lags?: number[] },
): Promise<DataRadarResult | null> {
  if (!priceIndex.baseDate || !priceIndex.latestDate || priceIndex.points.length === 0) {
    return null;
  }

  const lags = opts?.lags ?? DEFAULT_LAGS;
  const maxLag = Math.max(...lags, 0);
  const from = addDays(priceIndex.baseDate, -maxLag);
  if (!from) return null;

  const fx = await fetchBnaDollarSeries(from, priceIndex.latestDate, { carryForward: true });
  return computeBnaDataRadarWithFx(priceIndex, fx, from, lags);
}

function scopeStatus(scope: DataRadarScopeResult) {
  if (!scope.index.baseDate || scope.index.points.length === 0) return "no_price_history";
  if (!scope.radar) return "no_radar";
  return scope.radar.passThrough.lags.some((lag) => lag.status === "ready")
    ? "ready"
    : "insufficient_data";
}

export async function runBnaDataRadar(opts?: { lags?: number[] }): Promise<DataRadarRunResult> {
  const lags = opts?.lags ?? DEFAULT_LAGS;
  const maxLag = Math.max(...lags, 0);
  const scopes = [
    { categorySlug: null, label: "total" },
    ...mvpCategoryDescriptors.map((descriptor) => ({
      categorySlug: descriptor.slug,
      label: descriptor.slug,
    })),
  ];

  const indexed = await Promise.all(
    scopes.map(async (scope) => ({
      ...scope,
      index: await computePriceIndex({ categorySlug: scope.categorySlug }),
    })),
  );

  const active = indexed.filter((scope) => scope.index.baseDate && scope.index.latestDate);
  if (active.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      scopes: indexed.map((scope) => ({ ...scope, radar: null })),
      source: "bna",
      status: "no_price_history",
    };
  }

  const from = minIsoDate(
    active
      .map((scope) => addDays(scope.index.baseDate!, -maxLag))
      .filter((date): date is string => date !== null),
  );
  const to = maxIsoDate(active.map((scope) => scope.index.latestDate!));
  const fx = await fetchBnaDollarSeries(from, to, { carryForward: true });
  const status = fx.rates.length > 0 ? "ready" : "no_fx_data";

  return {
    generatedAt: new Date().toISOString(),
    scopes: indexed.map((scope) => ({
      ...scope,
      radar: computeBnaDataRadarWithFx(scope.index, fx, from, lags),
    })),
    source: "bna",
    status,
  };
}

async function ensureDataRadarSnapshotTable() {
  const prisma = getPrismaClient();
  if (!prisma) return null;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "DataRadarSnapshot" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "source" TEXT NOT NULL DEFAULT 'bna',
      "scope" TEXT NOT NULL,
      "categorySlug" TEXT,
      "snapshotDate" DATE NOT NULL,
      "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "status" TEXT NOT NULL,
      "priceBaseDate" DATE,
      "priceLatestDate" DATE,
      "priceDays" INTEGER NOT NULL DEFAULT 0,
      "productsTracked" INTEGER NOT NULL DEFAULT 0,
      "priceLatestIndex" DOUBLE PRECISION,
      "priceTotalChangePct" DOUBLE PRECISION,
      "fxFromDate" DATE,
      "fxToDate" DATE,
      "fxRates" INTEGER NOT NULL DEFAULT 0,
      "fxCarried" INTEGER NOT NULL DEFAULT 0,
      "betaLag0" DOUBLE PRECISION,
      "correlationLag0" DOUBLE PRECISION,
      "payload" JSONB NOT NULL,

      CONSTRAINT "DataRadarSnapshot_pkey" PRIMARY KEY ("id")
    )`;
  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "DataRadarSnapshot_source_scope_snapshotDate_key"
      ON "DataRadarSnapshot"("source", "scope", "snapshotDate")`;
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "DataRadarSnapshot_source_snapshotDate_idx"
      ON "DataRadarSnapshot"("source", "snapshotDate")`;
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "DataRadarSnapshot_scope_snapshotDate_idx"
      ON "DataRadarSnapshot"("scope", "snapshotDate")`;
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "DataRadarSnapshot_status_snapshotDate_idx"
      ON "DataRadarSnapshot"("status", "snapshotDate")`;

  return prisma;
}

export async function persistBnaDataRadarSnapshots(
  run: DataRadarRunResult,
): Promise<DataRadarPersistenceResult> {
  const prisma = await ensureDataRadarSnapshotTable();
  if (!prisma) return { status: "database_unavailable" };

  const snapshotDate = dateOnly(run.generatedAt);
  const generatedAt = run.generatedAt;
  let snapshots = 0;

  for (const scope of run.scopes) {
    const lag0 = scope.radar?.passThrough.lags.find((lag) => lag.lagDays === 0);
    const status = scopeStatus(scope);
    const payload = JSON.stringify({
      generatedAt: run.generatedAt,
      runStatus: run.status,
      scope,
      source: run.source,
    });

    await prisma.$executeRaw`
      INSERT INTO "DataRadarSnapshot" (
        "source",
        "scope",
        "categorySlug",
        "snapshotDate",
        "generatedAt",
        "status",
        "priceBaseDate",
        "priceLatestDate",
        "priceDays",
        "productsTracked",
        "priceLatestIndex",
        "priceTotalChangePct",
        "fxFromDate",
        "fxToDate",
        "fxRates",
        "fxCarried",
        "betaLag0",
        "correlationLag0",
        "payload"
      )
      VALUES (
        ${run.source},
        ${scope.label},
        ${scope.categorySlug},
        ${snapshotDate}::date,
        ${generatedAt}::timestamp,
        ${status},
        ${nullableDate(scope.index.baseDate)}::date,
        ${nullableDate(scope.index.latestDate)}::date,
        ${scope.index.days},
        ${scope.index.productsTracked},
        ${scope.index.latestIndex},
        ${scope.index.totalChangePct},
        ${nullableDate(scope.radar?.from)}::date,
        ${nullableDate(scope.radar?.to)}::date,
        ${scope.radar?.fx.rates.length ?? 0},
        ${scope.radar?.fx.carried ?? 0},
        ${lag0?.beta ?? null},
        ${lag0?.correlation ?? null},
        ${payload}::jsonb
      )
      ON CONFLICT ("source", "scope", "snapshotDate")
      DO UPDATE SET
        "categorySlug" = EXCLUDED."categorySlug",
        "generatedAt" = EXCLUDED."generatedAt",
        "status" = EXCLUDED."status",
        "priceBaseDate" = EXCLUDED."priceBaseDate",
        "priceLatestDate" = EXCLUDED."priceLatestDate",
        "priceDays" = EXCLUDED."priceDays",
        "productsTracked" = EXCLUDED."productsTracked",
        "priceLatestIndex" = EXCLUDED."priceLatestIndex",
        "priceTotalChangePct" = EXCLUDED."priceTotalChangePct",
        "fxFromDate" = EXCLUDED."fxFromDate",
        "fxToDate" = EXCLUDED."fxToDate",
        "fxRates" = EXCLUDED."fxRates",
        "fxCarried" = EXCLUDED."fxCarried",
        "betaLag0" = EXCLUDED."betaLag0",
        "correlationLag0" = EXCLUDED."correlationLag0",
        "payload" = EXCLUDED."payload"`;
    snapshots++;
  }

  return { snapshotDate, snapshots, status: "stored" };
}

function toIsoDate(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

export async function listDataRadarSnapshots(opts?: {
  limit?: number;
  source?: string;
}): Promise<DataRadarSnapshotSummary[]> {
  const prisma = getPrismaClient();
  if (!prisma) return [];

  try {
    const rows = await prisma.dataRadarSnapshot.findMany({
      orderBy: [{ snapshotDate: "desc" }, { scope: "asc" }],
      take: opts?.limit ?? 36,
      where: { source: opts?.source ?? "bna" },
    });

    return rows.map((row) => ({
      betaLag0: row.betaLag0,
      categorySlug: row.categorySlug,
      correlationLag0: row.correlationLag0,
      fxCarried: row.fxCarried,
      fxRates: row.fxRates,
      generatedAt: row.generatedAt.toISOString(),
      priceDays: row.priceDays,
      priceLatestIndex: row.priceLatestIndex,
      priceTotalChangePct: row.priceTotalChangePct,
      productsTracked: row.productsTracked,
      scope: row.scope,
      snapshotDate: toIsoDate(row.snapshotDate),
      source: row.source,
      status: row.status,
    }));
  } catch {
    return [];
  }
}
