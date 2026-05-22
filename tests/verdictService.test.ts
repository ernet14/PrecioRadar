import assert from "node:assert/strict";
import test from "node:test";
import { buildVerdictAndStats } from "../src/services/verdictService";
import { getMinPrice } from "../src/services/priceHistoryService";
import type { PriceHistoryPoint } from "../src/services/priceHistoryService";

// Día sin evento comercial cercano (evita el patrón pre-evento del detector).
const QUIET_DAY = new Date("2026-03-15T12:00:00.000Z");

function makeHistory(
  entries: Array<{ price: number; daysAgo: number }>,
): PriceHistoryPoint[] {
  return entries.map(({ price, daysAgo }) => {
    const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
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

test("getMinPrice: null con historial vacío", () => {
  assert.equal(getMinPrice([]), null);
});

test("getMinPrice: mínimo global sin ventana", () => {
  const history = makeHistory([
    { price: 1000, daysAgo: 1 },
    { price: 700, daysAgo: 50 },
    { price: 900, daysAgo: 5 },
  ]);
  assert.equal(getMinPrice(history), 700);
});

test("getMinPrice: respeta la ventana de días", () => {
  const history = makeHistory([
    { price: 900, daysAgo: 5 },
    { price: 700, daysAgo: 50 },
  ]);
  // En 30 días solo entra el de 900.
  assert.equal(getMinPrice(history, 30), 900);
  // En 90 días entra el más barato.
  assert.equal(getMinPrice(history, 90), 700);
});

test("getMinPrice: null si la ventana no contiene puntos", () => {
  const history = makeHistory([{ price: 800, daysAgo: 60 }]);
  assert.equal(getMinPrice(history, 7), null);
});

test("buildVerdictAndStats: compone veredicto + stats con ventanas correctas", () => {
  const baseline = Array.from({ length: 14 }, (_, i) => ({
    price: 1_000_000,
    daysAgo: i * 4 + 1, // 1..53, todos dentro de 60 días
  }));
  const history = makeHistory([
    ...baseline,
    { price: 900_000, daysAgo: 2 }, // dentro de 30
    { price: 800_000, daysAgo: 75 }, // dentro de 90, fuera de 30
    { price: 700_000, daysAgo: 200 }, // fuera de 90
  ]);

  const result = buildVerdictAndStats({
    currentPrice: 850_000,
    history,
    categorySlug: "celulares",
    now: QUIET_DAY,
  });

  assert.equal(result.verdict.verdict, "REAL");
  assert.equal(result.stats.current, 850_000);
  assert.equal(result.stats.avg60, result.verdict.avg60); // misma referencia de 60d
  assert.equal(result.stats.min30, 900_000);
  assert.equal(result.stats.min90, 800_000);
  assert.equal(result.stats.minAll, 700_000);
  assert.equal(result.stats.maxAll, 1_000_000);
  assert.equal(result.stats.pointsCount, 17);
  assert.equal(result.stats.isSufficient, true);

  // Invariante: ventanas más amplias nunca tienen un mínimo mayor.
  assert.ok(result.stats.minAll! <= result.stats.min90!);
  assert.ok(result.stats.min90! <= result.stats.min30!);
});

test("buildVerdictAndStats: historial vacío → NO_DATA y stats en null", () => {
  const result = buildVerdictAndStats({ currentPrice: 1000, history: [], now: QUIET_DAY });

  assert.equal(result.verdict.verdict, "NO_DATA");
  assert.equal(result.stats.avg60, null);
  assert.equal(result.stats.averageAll, null);
  assert.equal(result.stats.min30, null);
  assert.equal(result.stats.min90, null);
  assert.equal(result.stats.minAll, null);
  assert.equal(result.stats.maxAll, null);
  assert.equal(result.stats.pointsCount, 0);
  assert.equal(result.stats.isSufficient, false);
});
