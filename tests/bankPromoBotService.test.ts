import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  buildBankPromoImportCandidate,
  detectBankPromoEvents,
  importBankPromosFromConfiguredSources,
  parseBankPromoSourceUrls,
} from "../src/services/bankPromoBotService";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalDirectUrl = process.env.DIRECT_URL;
const originalSourceUrls = process.env.BANK_PROMO_SOURCE_URLS;

function localDateKey(date: Date | null | undefined) {
  if (!date) return null;
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

afterEach(() => {
  restoreEnv("DATABASE_URL", originalDatabaseUrl);
  restoreEnv("DIRECT_URL", originalDirectUrl);
  restoreEnv("BANK_PROMO_SOURCE_URLS", originalSourceUrls);
});

test("parseBankPromoSourceUrls deduplicates comma and newline separated URLs", () => {
  assert.deepEqual(
    parseBankPromoSourceUrls(
      "https://www.bbva.com.ar/a, https://galicia.ar/b\nhttps://www.bbva.com.ar/a",
    ),
    ["https://www.bbva.com.ar/a", "https://galicia.ar/b"],
  );
  assert.deepEqual(parseBankPromoSourceUrls("  \n "), []);
});

test("importBankPromosFromConfiguredSources reports missing database", async () => {
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;
  process.env.BANK_PROMO_SOURCE_URLS = "https://www.bbva.com.ar/promos";

  const result = await importBankPromosFromConfiguredSources();

  assert.equal(result.status, "database_unavailable");
});

test("detectBankPromoEvents detects commercial event names", () => {
  const events = detectBankPromoEvents(
    "Promo especial Hot Sale y adelanto de Cyber Monday con bancos adheridos.",
  );

  assert.deepEqual(
    events.map((event) => event.slug),
    ["hot-sale-2026", "cybermonday-2026"],
  );
});

test("buildBankPromoImportCandidate autopublishes only verified current promos", () => {
  const candidate = buildBankPromoImportCandidate({
    now: new Date("2026-05-12T12:00:00"),
    sourceText:
      "BBVA Hot Sale 30% de descuento del 11/05/2026 al 17/05/2026 con tope de $8.000.",
    sourceUrl: "https://www.bbva.com.ar/promos/hot-sale",
  });

  assert.equal(candidate.status, "ready");
  if (candidate.status !== "ready") return;
  assert.equal(candidate.verified, true);
  assert.equal(candidate.data.active, true);
  assert.equal(localDateKey(candidate.data.validFrom), "2026-05-11");
  assert.equal(localDateKey(candidate.data.validUntil), "2026-05-17");
  assert.match(candidate.data.notes, /Evento detectado: Hot Sale 2026/);
});

test("buildBankPromoImportCandidate keeps unconfirmed promos inactive", () => {
  const candidate = buildBankPromoImportCandidate({
    now: new Date("2026-05-12T12:00:00"),
    sourceText: "BBVA 30% de descuento con tope de $8.000.",
    sourceUrl: "https://www.bbva.com.ar/promos/sin-vigencia",
  });

  assert.equal(candidate.status, "ready");
  if (candidate.status !== "ready") return;
  assert.equal(candidate.verified, false);
  assert.equal(candidate.data.active, false);
  assert.equal(candidate.data.validUntil, null);
});
