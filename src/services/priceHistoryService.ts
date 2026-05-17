import type { CurrencyCode } from "@/types";

export type PriceHistoryRangeDays = 7 | 30 | 90;

export type PriceHistoryPoint = {
  date: string;
  recordedAt: string;
  price: number;
  currency: CurrencyCode;
  source: string;
  isDemo: boolean;
};

export type PriceHistoryStats = {
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  averagePrice: number;
  variationPercent: number | null;
  pointsCount: number;
  isSufficient: boolean;
  lastUpdatedAt: string;
};

export function getAveragePrice(history: PriceHistoryPoint[], days: number): number | null {
  if (history.length === 0) return null;

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const filtered = history.filter(
    (point) => new Date(point.recordedAt).getTime() >= cutoff,
  );

  if (filtered.length < 3) return null;

  return filtered.reduce((total, point) => total + point.price, 0) / filtered.length;
}

export function getPriceHistoryForRange(
  history: PriceHistoryPoint[],
  rangeDays: PriceHistoryRangeDays,
) {
  if (history.length === 0) {
    return [];
  }

  const sortedHistory = [...history].sort((left, right) =>
    left.recordedAt.localeCompare(right.recordedAt),
  );
  const latestTime = new Date(
    sortedHistory[sortedHistory.length - 1].recordedAt,
  ).getTime();
  const minTime = latestTime - (rangeDays - 1) * 24 * 60 * 60 * 1000;

  return sortedHistory.filter(
    (point) => new Date(point.recordedAt).getTime() >= minTime,
  );
}

export function calculatePriceHistoryStats(
  history: PriceHistoryPoint[],
  currentPrice: number,
): PriceHistoryStats {
  if (history.length === 0) {
    return {
      currentPrice,
      minPrice: currentPrice,
      maxPrice: currentPrice,
      averagePrice: currentPrice,
      variationPercent: null,
      pointsCount: 0,
      isSufficient: false,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  const sortedHistory = [...history].sort((left, right) =>
    left.recordedAt.localeCompare(right.recordedAt),
  );
  const prices = sortedHistory.map((point) => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const averagePrice =
    prices.reduce((total, price) => total + price, 0) / prices.length;
  const firstPrice = prices[0];
  const variationPercent =
    firstPrice > 0 ? ((currentPrice - firstPrice) / firstPrice) * 100 : null;

  return {
    currentPrice,
    minPrice,
    maxPrice,
    averagePrice,
    variationPercent,
    pointsCount: sortedHistory.length,
    isSufficient: sortedHistory.length >= 14,
    lastUpdatedAt: sortedHistory[sortedHistory.length - 1].recordedAt,
  };
}
