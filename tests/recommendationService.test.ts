import assert from "node:assert/strict";
import test from "node:test";
import { getPurchaseRecommendation } from "../src/services/recommendationService";
import type { PriceHistoryPoint } from "../src/services/priceHistoryService";

const AVAILABLE_PRODUCT = {
  available: true,
  externalId: "MLA1",
  provider: "mercadolibre" as const,
  storeSlug: "mercadolibre",
  storeName: "MercadoLibre",
  title: "Producto Test",
  name: "Producto Test",
  normalizedName: "producto test",
  brand: null,
  model: null,
  categorySlug: null,
  imageUrl: null,
  productUrl: "https://mercadolibre.com.ar/test",
  price: 0,
  currency: "ARS" as const,
  condition: "UNKNOWN" as const,
  isDemo: false,
  lastCheckedAt: new Date(),
};

function makeHistory(
  prices: number[],
  daysAgo: number[] = prices.map((_, i) => i),
): PriceHistoryPoint[] {
  return prices.map((price, i) => {
    const d = new Date(Date.now() - daysAgo[i] * 24 * 60 * 60 * 1000);
    return {
      date: d.toISOString().slice(0, 10),
      recordedAt: d.toISOString(),
      price,
      currency: "ARS" as const,
      source: "cron",
      isDemo: false,
    };
  });
}

test("returns INSUFFICIENT_DATA when history is insufficient", () => {
  const history = makeHistory([900000, 850000]);
  const result = getPurchaseRecommendation({
    currentPrice: 900000,
    history,
    product: { ...AVAILABLE_PRODUCT, price: 900000 },
  });

  assert.equal(result.level, "INSUFFICIENT_DATA");
  assert.equal(result.label, "Sin historial verificado");
});

test("detects INFLATED_OFFER when current price exceeds 60-day average", () => {
  // 14+ points at $800k for the last 60 days, current "oferta" at $990k
  const historicalPrices = Array.from({ length: 14 }, () => 800000);
  const history = makeHistory(historicalPrices, historicalPrices.map((_, i) => i * 4));

  const result = getPurchaseRecommendation({
    currentPrice: 990000,
    history,
    product: { ...AVAILABLE_PRODUCT, price: 990000 },
  });

  assert.equal(result.level, "INFLATED_OFFER");
  assert.equal(result.label, "Oferta inflada");
});

test("returns EXCELLENT_PRICE near all-time minimum even above 60-day avg", () => {
  // Many points at $800k then a dip to $400k (new minimum)
  const base = Array.from({ length: 12 }, () => 800000);
  const history = makeHistory(
    [...base, 400000, 450000],
    [...base.map((_, i) => i * 4), 2, 1],
  );

  const result = getPurchaseRecommendation({
    currentPrice: 412000, // ≤3% above min (400k)
    history,
    product: { ...AVAILABLE_PRODUCT, price: 412000 },
  });

  assert.equal(result.level, "EXCELLENT_PRICE");
});

test("returns GOOD_PRICE when price is below 60-day average but above min", () => {
  // 7 puntos viejos a $900k (>60 días), 7 puntos recientes a $1100k (dentro de 60 días)
  // avg60 = $1100k, avg total ≈ $1000k, min = $900k
  // currentPrice = $950k: 5.6% sobre min (no EXCELLENT), bajo avg60 (no INFLATED), sin drops recientes (no WAIT)
  const oldPrices = Array.from({ length: 7 }, () => 900000);
  const recentPrices = Array.from({ length: 7 }, () => 1100000);
  const oldDays = [74, 72, 70, 68, 66, 64, 62];
  const recentDays = [14, 12, 10, 8, 6, 4, 2];
  const history = makeHistory(
    [...oldPrices, ...recentPrices],
    [...oldDays, ...recentDays],
  );

  const result = getPurchaseRecommendation({
    currentPrice: 950000,
    history,
    product: { ...AVAILABLE_PRODUCT, price: 950000 },
  });

  assert.equal(result.level, "GOOD_PRICE");
});

test("returns WAIT when product is unavailable", () => {
  const history = makeHistory(Array.from({ length: 14 }, () => 800000));

  const result = getPurchaseRecommendation({
    currentPrice: 800000,
    history,
    product: { ...AVAILABLE_PRODUCT, price: 800000, available: false },
  });

  assert.equal(result.level, "WAIT");
});
