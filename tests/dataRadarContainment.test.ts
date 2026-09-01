import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  acquireCronRunGuard,
  type CronGuardStore,
} from "../src/lib/cronRunGuard";
import {
  computePriceIndexes,
  MAX_PRICE_INDEX_ROWS,
  MAX_PRICE_INDEX_SCOPES,
  type PriceIndexSourceRow,
} from "../src/services/priceIndexService";

class FakeGuardStore implements CronGuardStore {
  nowMs = Date.parse("2026-08-31T00:00:00.000Z");
  private cooldowns = new Map<string, number>();
  private dailyCounts = new Map<string, number>();

  async acquireCooldown(key: string, _token: string, ttlSeconds: number) {
    if ((this.cooldowns.get(key) ?? 0) > this.nowMs) return false;
    this.cooldowns.set(key, this.nowMs + ttlSeconds * 1000);
    return true;
  }

  async incrementDaily(key: string) {
    const count = (this.dailyCounts.get(key) ?? 0) + 1;
    this.dailyCounts.set(key, count);
    return count;
  }
}

const guardOptions = {
  enabled: true,
  jobName: "data-radar-test",
  maxRunsPerDay: 2,
  minIntervalSeconds: 60 * 60,
};

test("data radar is scheduled daily, never every minute", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
    crons: Array<{ path: string; schedule: string }>;
  };
  const job = config.crons.find((cron) => cron.path === "/api/internal/data-radar");

  assert.equal(job?.schedule, "0 11 * * *");
  assert.equal(config.crons.some((cron) => cron.schedule === "* * * * *"), false);
});

test("distributed cooldown prevents overlapping executions", async () => {
  const store = new FakeGuardStore();
  const now = new Date(store.nowMs);
  const [first, second] = await Promise.all([
    acquireCronRunGuard({ ...guardOptions, now, store }),
    acquireCronRunGuard({ ...guardOptions, now, store }),
  ]);

  assert.equal([first, second].filter((decision) => decision.allowed).length, 1);
  assert.equal(
    [first, second].some((decision) => !decision.allowed && decision.reason === "cooldown"),
    true,
  );
});

test("daily budget caps successful executions and partial errors cannot loop", async () => {
  const store = new FakeGuardStore();
  const first = await acquireCronRunGuard({
    ...guardOptions,
    now: new Date(store.nowMs),
    store,
  });
  assert.equal(first.allowed, true);

  // Una falla no libera el cooldown: los reintentos por minuto se omiten.
  const immediateRetry = await acquireCronRunGuard({
    ...guardOptions,
    now: new Date(store.nowMs),
    store,
  });
  assert.deepEqual(immediateRetry, { allowed: false, reason: "cooldown" });

  store.nowMs += 61 * 60 * 1000;
  const second = await acquireCronRunGuard({
    ...guardOptions,
    now: new Date(store.nowMs),
    store,
  });
  assert.equal(second.allowed, true);

  store.nowMs += 61 * 60 * 1000;
  const third = await acquireCronRunGuard({
    ...guardOptions,
    now: new Date(store.nowMs),
    store,
  });
  assert.deepEqual(third, { allowed: false, reason: "budget_exhausted" });
});

test("kill switch fails closed without touching the guard store", async () => {
  let touched = false;
  const store: CronGuardStore = {
    async acquireCooldown() {
      touched = true;
      return true;
    },
    async incrementDaily() {
      touched = true;
      return 1;
    },
  };

  const decision = await acquireCronRunGuard({ ...guardOptions, enabled: false, store });
  assert.deepEqual(decision, { allowed: false, reason: "disabled" });
  assert.equal(touched, false);
});

test("price index loads one bounded projection for all scopes", async () => {
  let loads = 0;
  const row: PriceIndexSourceRow = {
    category_slug: "celulares",
    day: new Date("2026-08-31T00:00:00.000Z"),
    median_price: 100,
    product_id: "product-1",
    product_name: "Celular",
  };
  const rows: PriceIndexSourceRow[] = Array(MAX_PRICE_INDEX_ROWS + 5).fill(row);
  const scopes = [null, ...Array.from({ length: 30 }, (_, index) => `scope-${index}`)];

  const batch = await computePriceIndexes(scopes, async () => {
    loads += 1;
    return rows;
  });

  assert.equal(loads, 1);
  assert.equal(batch.rowsRead, MAX_PRICE_INDEX_ROWS);
  assert.equal(batch.truncated, true);
  assert.equal(batch.scopes.length, MAX_PRICE_INDEX_SCOPES);
});

test("price index SQL selects explicit columns and has a strict LIMIT", () => {
  const source = readFileSync("src/services/priceIndexService.ts", "utf8");
  const radarSource = readFileSync("src/services/dataRadarService.ts", "utf8");
  assert.equal(/SELECT\s+\*/i.test(source), false);
  assert.match(source, /ORDER BY day DESC, product_id ASC/);
  assert.match(source, /LIMIT \$\{MAX_PRICE_INDEX_ROWS\}/);
  assert.match(radarSource, /computePriceIndexes\(scopes\.map/);
  assert.doesNotMatch(radarSource, /scopes\.map\(async[\s\S]+computePriceIndex/);
});

test("all expensive analytics routes share one daily guard", () => {
  const dataRadarRoute = readFileSync("src/app/api/internal/data-radar/route.ts", "utf8");
  const readinessRoute = readFileSync(
    "src/app/api/internal/phase-readiness/route.ts",
    "utf8",
  );
  const publicIndexPage = readFileSync("src/app/indice/page.tsx", "utf8");

  assert.match(dataRadarRoute, /jobName: PRICE_INDEX_JOB_GUARD_NAME/);
  assert.match(readinessRoute, /jobName: PRICE_INDEX_JOB_GUARD_NAME/);
  assert.match(dataRadarRoute, /MAX_RUNS_PER_DAY = 1/);
  assert.match(readinessRoute, /maxRunsPerDay: 1/);
  assert.match(publicIndexPage, /process\.env\.NODE_ENV === "production"/);
});
