import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  buildOfferClickHref,
  getAffiliateDestination,
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

test("keeps normal product URL when affiliates are disabled", () => {
  const destination = getAffiliateDestination({
    affiliateEnabled: false,
    affiliateLinks: [
      {
        affiliateUrl: "https://affiliate.test/a55",
        originalUrl: "https://store.test/a55",
        productId: "product-a55",
      },
    ],
    offerAffiliateUrl: "https://affiliate.test/direct-a55",
    productId: "product-a55",
    productUrl: "https://store.test/a55",
  });

  assert.equal(destination.isAffiliate, false);
  assert.equal(destination.url, "https://store.test/a55");
});

test("uses direct offer affiliate URL first when enabled", () => {
  const destination = getAffiliateDestination({
    affiliateEnabled: true,
    affiliateLinks: [
      {
        affiliateUrl: "https://affiliate.test/a55",
        originalUrl: "https://store.test/a55",
        productId: "product-a55",
      },
    ],
    offerAffiliateUrl: "https://affiliate.test/direct-a55",
    productId: "product-a55",
    productUrl: "https://store.test/a55",
  });

  assert.equal(destination.isAffiliate, true);
  assert.equal(destination.url, "https://affiliate.test/direct-a55");
});

test("appends affiliate tag to URL when enabled and no specific link exists", () => {
  const destination = getAffiliateDestination({
    affiliateEnabled: true,
    affiliateLinks: [],
    affiliateTag: "precioradar",
    productId: "product-a55",
    productUrl: "https://www.mercadolibre.com.ar/MLA-123456789-samsung-galaxy-a55-_JM",
  });

  assert.equal(destination.isAffiliate, true);
  assert.equal(
    destination.url,
    "https://www.mercadolibre.com.ar/MLA-123456789-samsung-galaxy-a55-_JM?custom_id=precioradar",
  );
});

test("prefers product affiliate links over original URL links", () => {
  const destination = getAffiliateDestination({
    affiliateEnabled: true,
    affiliateLinks: [
      {
        affiliateUrl: "https://affiliate.test/url-a55",
        originalUrl: "https://store.test/a55",
        productId: null,
      },
      {
        affiliateUrl: "https://affiliate.test/product-a55",
        originalUrl: "https://store.test/other-a55",
        productId: "product-a55",
      },
    ],
    productId: "product-a55",
    productUrl: "https://store.test/a55",
  });

  assert.equal(destination.isAffiliate, true);
  assert.equal(destination.url, "https://affiliate.test/product-a55");
});
