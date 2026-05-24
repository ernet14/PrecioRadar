import assert from "node:assert/strict";
import test from "node:test";
import { computePassThrough, parseFxCsv } from "../src/services/passThroughService";
import type { PriceIndexResult } from "../src/services/priceIndexService";

const priceIndex: PriceIndexResult = {
  baseDate: "2026-05-20",
  latestDate: "2026-05-24",
  latestIndex: 104,
  totalChangePct: 4,
  productsTracked: 100,
  days: 5,
  points: [
    { date: "2026-05-20", index: 100, sampleSize: 80 },
    { date: "2026-05-21", index: 101, sampleSize: 80 },
    { date: "2026-05-22", index: 102, sampleSize: 80 },
    { date: "2026-05-23", index: 103, sampleSize: 80 },
    { date: "2026-05-24", index: 104, sampleSize: 80 },
  ],
};

test("parseFxCsv accepts date/rate headers", () => {
  const parsed = parseFxCsv(`date,rate
2026-05-20,1000
2026-05-21,1010
bad,row
2026-05-22,1020`);

  assert.deepEqual(parsed, [
    { date: "2026-05-20", rate: 1000 },
    { date: "2026-05-21", rate: 1010 },
    { date: "2026-05-22", rate: 1020 },
  ]);
});

test("computePassThrough estimates beta and correlation for aligned series", () => {
  const result = computePassThrough(
    priceIndex,
    [
      { date: "2026-05-20", rate: 1000 },
      { date: "2026-05-21", rate: 1010 },
      { date: "2026-05-22", rate: 1020 },
      { date: "2026-05-23", rate: 1030 },
      { date: "2026-05-24", rate: 1040 },
    ],
    [0],
  );

  assert.equal(result.priceDays, 5);
  assert.equal(result.lags[0].status, "ready");
  assert.equal(result.lags[0].matchedDays, 5);
  assert.equal(result.lags[0].priceChangePct, 4);
  assert.equal(result.lags[0].fxChangePct, 4);
  assert.equal(result.lags[0].beta, 1);
  assert.ok((result.lags[0].correlation ?? 0) > 0.99);
});

test("computePassThrough marks insufficient lag matches", () => {
  const result = computePassThrough(
    priceIndex,
    [
      { date: "2026-05-13", rate: 1000 },
      { date: "2026-05-14", rate: 1010 },
    ],
    [7],
  );

  assert.equal(result.lags[0].status, "insufficient_data");
  assert.equal(result.lags[0].beta, null);
});
