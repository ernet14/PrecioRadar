import { mvpCategoryDescriptors } from "@/data/categories";
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

function addDays(date: string, days: number) {
  const ms = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
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
