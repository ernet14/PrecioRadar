import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  buildOfferClickHref,
  getOfferClickTarget,
  recordOfferClick,
} from "../src/services/clickTrackingService";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalDirectUrl = process.env.DIRECT_URL;

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
});

test("builds internal offer click URLs from slug and offer key", () => {
  const href = buildOfferClickHref({
    offerKey: "mercadolibre:mock-ml-a55-256",
    productSlug: "samsung-galaxy-a55-5g-256gb",
  });

  assert.equal(
    href,
    "/api/out?offer=mercadolibre%3Amock-ml-a55-256&slug=samsung-galaxy-a55-5g-256gb",
  );
});

test("resolves known demo offers for outbound redirects", () => {
  const target = getOfferClickTarget({
    offerKey: "mercadolibre:mock-ml-a55-256",
    productSlug: "samsung-galaxy-a55-5g-256gb",
  });

  assert.equal(
    target?.offer.productUrl,
    "https://www.mercadolibre.com.ar/demo/samsung-galaxy-a55",
  );
});

test("keeps outbound links working when database is unavailable", async () => {
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;

  const result = await recordOfferClick({
    offerKey: "mercadolibre:mock-ml-a55-256",
    productSlug: "samsung-galaxy-a55-5g-256gb",
  });

  assert.equal(result.status, "database_unavailable");
  assert.equal(
    result.url,
    "https://www.mercadolibre.com.ar/demo/samsung-galaxy-a55",
  );
});
