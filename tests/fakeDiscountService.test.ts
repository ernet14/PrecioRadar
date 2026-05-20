import assert from "node:assert/strict";
import test from "node:test";
import {
  detectDealQuality,
  getCategoryDiscountThreshold,
} from "../src/services/fakeDiscountService";
import type { PriceHistoryPoint } from "../src/services/priceHistoryService";

// Fechas sin evento comercial cercano (evita interferencia del patrón pre-evento).
const QUIET_DAY = new Date("2026-03-15T12:00:00.000Z");
// Día durante el Hot Sale 2026 (11–17 mayo).
const HOT_SALE_DAY = new Date("2026-05-12T12:00:00.000Z");

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

test("NO_DATA cuando hay menos de 14 capturas", () => {
  const result = detectDealQuality({
    currentPrice: 900000,
    history: makeHistory([900000, 880000]),
    categorySlug: "celulares",
    now: QUIET_DAY,
  });

  assert.equal(result.verdict, "NO_DATA");
});

test("INFLATED cuando el precio actual supera el promedio de 60 días", () => {
  const history = makeHistory(
    Array.from({ length: 14 }, () => 1000000),
    Array.from({ length: 14 }, (_, i) => i * 4),
  );

  const result = detectDealQuality({
    currentPrice: 1100000,
    history,
    categorySlug: "celulares",
    now: QUIET_DAY,
  });

  assert.equal(result.verdict, "INFLATED");
});

test("REAL cuando el descuento supera el umbral de la categoría", () => {
  const history = makeHistory(
    Array.from({ length: 14 }, () => 1000000),
    Array.from({ length: 14 }, (_, i) => i * 4),
  );

  const result = detectDealQuality({
    currentPrice: 850000, // 15% por debajo del promedio
    history,
    categorySlug: "celulares", // umbral 10%
    now: QUIET_DAY,
  });

  assert.equal(result.verdict, "REAL");
});

test("MINOR cuando hay descuento pero por debajo del umbral", () => {
  const history = makeHistory(
    Array.from({ length: 14 }, () => 1000000),
    Array.from({ length: 14 }, (_, i) => i * 4),
  );

  const result = detectDealQuality({
    currentPrice: 950000, // 5% por debajo del promedio, umbral 10%
    history,
    categorySlug: "celulares",
    now: QUIET_DAY,
  });

  assert.equal(result.verdict, "MINOR");
});

test("el umbral por categoría cambia el veredicto con el mismo descuento", () => {
  const history = makeHistory(
    Array.from({ length: 14 }, () => 1000000),
    Array.from({ length: 14 }, (_, i) => i * 4),
  );

  // 12% de descuento: real para celulares (10%), menor para indumentaria (25%)
  const tech = detectDealQuality({
    currentPrice: 880000,
    history,
    categorySlug: "celulares",
    now: QUIET_DAY,
  });
  const apparel = detectDealQuality({
    currentPrice: 880000,
    history,
    categorySlug: "indumentaria",
    now: QUIET_DAY,
  });

  assert.equal(tech.verdict, "REAL");
  assert.equal(apparel.verdict, "MINOR");
});

test("INFLATED por patrón 'infla antes del evento' aunque hoy esté algo más barato", () => {
  // 10 capturas viejas altas (>14 días) + suba fuerte en los 14 días previos.
  const oldPrices = Array.from({ length: 10 }, () => 1100000);
  const oldDays = Array.from({ length: 10 }, (_, i) => 60 - i * 4); // 60,56,...24
  const recentPrices = [800000, 820000, 850000, 880000, 910000, 940000, 950000];
  const recentDays = [13, 11, 9, 7, 5, 3, 1];

  const history = makeHistory(
    [...oldPrices, ...recentPrices],
    [...oldDays, ...recentDays],
  );

  const result = detectDealQuality({
    currentPrice: 950000, // por debajo del promedio, pero subió ~19% en 14 días
    history,
    categorySlug: "celulares",
    now: HOT_SALE_DAY,
  });

  assert.equal(result.verdict, "INFLATED");
  assert.ok(result.preEventInflation);
});

test("getCategoryDiscountThreshold usa default para categoría desconocida", () => {
  assert.equal(getCategoryDiscountThreshold("celulares"), 0.1);
  assert.equal(getCategoryDiscountThreshold("indumentaria"), 0.25);
  assert.equal(getCategoryDiscountThreshold("categoria-rara"), 0.1);
  assert.equal(getCategoryDiscountThreshold(null), 0.1);
});
