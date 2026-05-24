import { fetchBnaDollarSeries, type BnaDollarSeriesResult } from "@/services/bnaDollarService";
import { computePassThrough, type PassThroughResult } from "@/services/passThroughService";
import type { PriceIndexResult } from "@/services/priceIndexService";

const DEFAULT_LAGS = [0, 1, 3, 7, 14];

export type DataRadarResult = {
  fx: BnaDollarSeriesResult;
  from: string;
  lags: number[];
  passThrough: PassThroughResult;
  source: "bna";
  to: string;
};

function addDays(date: string, days: number) {
  const ms = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
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
