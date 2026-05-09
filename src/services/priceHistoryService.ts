import type { ProviderProduct } from "@/providers/stores";
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

function hashText(text: string) {
  return text.split("").reduce((hash, char) => hash + char.charCodeAt(0), 0);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getHistoryPattern(product: ProviderProduct) {
  const normalizedName = product.normalizedName;

  if (normalizedName.includes("rtx")) {
    return "expensive";
  }

  if (normalizedName.includes("drean") || normalizedName.includes("playstation")) {
    return "wait";
  }

  if (
    normalizedName.includes("a55") ||
    normalizedName.includes("jbl") ||
    normalizedName.includes("bosch")
  ) {
    return "excellent";
  }

  return hashText(normalizedName) % 2 === 0 ? "good" : "normal";
}

function getPriceFactor({
  dayIndex,
  pattern,
  seed,
}: {
  dayIndex: number;
  pattern: string;
  seed: number;
}) {
  const age = 89 - dayIndex;
  const progressToToday = dayIndex / 89;
  const pastWeight = 1 - progressToToday;
  const wave = Math.sin((dayIndex + seed) / 5) * 0.018;

  if (dayIndex === 89) {
    return 1;
  }

  if (pattern === "excellent") {
    return 1 + pastWeight * 0.16 + Math.max(wave, 0);
  }

  if (pattern === "good") {
    return 1 + pastWeight * 0.08 + wave;
  }

  if (pattern === "expensive") {
    return 0.88 + progressToToday * 0.14 + Math.max(wave, 0);
  }

  if (pattern === "wait") {
    const recentDrop = age <= 12 ? (12 - age) * 0.006 : 0;
    return 1.08 + pastWeight * 0.04 - recentDrop + wave;
  }

  return 1 + wave + pastWeight * 0.025;
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
    isSufficient: sortedHistory.length >= 7,
    lastUpdatedAt: sortedHistory[sortedHistory.length - 1].recordedAt,
  };
}

export function getMockPriceHistoryForProduct(
  product: ProviderProduct,
): PriceHistoryPoint[] {
  const seed = hashText(product.normalizedName);
  const pattern = getHistoryPattern(product);
  const latestDate = new Date(product.lastCheckedAt);

  return Array.from({ length: 90 }, (_, index) => {
    const recordedAt = addDays(latestDate, index - 89);
    const factor = getPriceFactor({ dayIndex: index, pattern, seed });
    const price =
      index === 89
        ? product.price
        : Math.round((product.price * factor) / 100) * 100;

    return {
      date: toDateKey(recordedAt),
      recordedAt: recordedAt.toISOString(),
      price,
      currency: product.currency,
      source: "mock-history",
      isDemo: true,
    };
  });
}
