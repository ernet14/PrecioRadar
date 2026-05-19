import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { mercadoLibreProvider } from "../src/providers/stores/mercadoLibreProvider";

const originalFetch = globalThis.fetch;
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalDirectUrl = process.env.DIRECT_URL;

function mockJsonFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => unknown,
  status = 200,
) {
  globalThis.fetch = (async (input, init) => {
    return new Response(JSON.stringify(handler(input, init)), {
      headers: { "content-type": "application/json" },
      status,
    });
  }) as typeof fetch;
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.MERCADOLIBRE_ACCESS_TOKEN;
  delete process.env.MERCADOLIBRE_SITE_ID;
  restoreEnv("DATABASE_URL", originalDatabaseUrl);
  restoreEnv("DIRECT_URL", originalDirectUrl);
});

test("searches MercadoLibre MLA and normalizes results", async () => {
  process.env.MERCADOLIBRE_ACCESS_TOKEN = "test-token";
  let requestedUrl = "";
  let authorizationHeader = "";

  mockJsonFetch((input, init) => {
    requestedUrl = String(input);
    authorizationHeader = String(
      new Headers(init?.headers).get("authorization"),
    );

    return {
      results: [
        {
          id: "MLA123456789",
          title: "Samsung Galaxy A55 5G 256 GB",
          price: 799999,
          currency_id: "ARS",
          permalink:
            "https://articulo.mercadolibre.com.ar/MLA-123456789-samsung-galaxy-a55-_JM",
          thumbnail: "https://http2.mlstatic.com/D_123.jpg",
          condition: "new",
          available_quantity: 1,
          category_id: "MLA1055",
          attributes: [
            { id: "BRAND", value_name: "Samsung" },
            { id: "MODEL", value_name: "Galaxy A55" },
          ],
        },
      ],
    };
  });

  const products = await mercadoLibreProvider.searchProducts("Galaxy A55");

  assert.equal(
    requestedUrl,
    "https://api.mercadolibre.com/sites/MLA/search?limit=10&q=Galaxy+A55",
  );
  // search es public-first: el primer intento NO debe llevar Bearer.
  assert.equal(authorizationHeader, "null");
  assert.equal(products.length, 1);
  assert.equal(products[0].externalId, "MLA123456789");
  assert.equal(products[0].brand, "Samsung");
  assert.equal(products[0].model, "Galaxy A55");
  assert.equal(products[0].condition, "NEW");
  assert.equal(products[0].isDemo, false);
});

test("resolves a MercadoLibre item URL through the item endpoint", async () => {
  process.env.MERCADOLIBRE_ACCESS_TOKEN = "test-token";
  let requestedUrl = "";

  mockJsonFetch((input) => {
    requestedUrl = String(input);

    return {
      id: "MLA123456789",
      title: "Samsung Galaxy A55 5G",
      price: 799999,
      currency_id: "ARS",
      permalink:
        "https://articulo.mercadolibre.com.ar/MLA-123456789-samsung-galaxy-a55-_JM",
      condition: "used",
      available_quantity: 0,
    };
  });

  const product = await mercadoLibreProvider.getProductByUrl(
    "https://articulo.mercadolibre.com.ar/MLA-123456789-samsung-galaxy-a55-_JM",
  );

  assert.equal(requestedUrl, "https://api.mercadolibre.com/items/MLA123456789");
  assert.equal(product?.externalId, "MLA123456789");
  assert.equal(product?.condition, "USED");
  assert.equal(product?.available, false);
});

test("gets current price from a MercadoLibre external id", async () => {
  process.env.MERCADOLIBRE_ACCESS_TOKEN = "test-token";
  mockJsonFetch(() => ({
    id: "MLA123456789",
    title: "Samsung Galaxy A55 5G",
    price: 799999,
    currency_id: "ARS",
    permalink:
      "https://articulo.mercadolibre.com.ar/MLA-123456789-samsung-galaxy-a55-_JM",
    condition: "new",
    available_quantity: 1,
  }));

  const price = await mercadoLibreProvider.getCurrentPrice({
    externalId: "MLA123456789",
  });

  assert.equal(price?.externalId, "MLA123456789");
  assert.equal(price?.price, 799999);
  assert.equal(price?.available, true);
});

test("returns an empty MercadoLibre result on provider HTTP errors", async () => {
  process.env.MERCADOLIBRE_ACCESS_TOKEN = "test-token";
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;

  mockJsonFetch(() => ({ message: "internal error" }), 500);

  const products = await mercadoLibreProvider.searchProducts("Galaxy A55");

  assert.deepEqual(products, []);
});

test("returns empty result when MercadoLibre token is absent", async () => {
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;

  const products = await mercadoLibreProvider.searchProducts("Galaxy A55");

  assert.deepEqual(products, []);
});

test("returns empty result on MercadoLibre 403 auth rejection", async () => {
  process.env.MERCADOLIBRE_ACCESS_TOKEN = "test-token";
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;

  mockJsonFetch(() => ({ message: "Forbidden" }), 403);

  const products = await mercadoLibreProvider.searchProducts("Galaxy A55");

  assert.deepEqual(products, []);
});

test("returns empty result on MercadoLibre 401 invalid token", async () => {
  process.env.MERCADOLIBRE_ACCESS_TOKEN = "expired-token";
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;

  mockJsonFetch(() => ({ message: "Unauthorized" }), 401);

  const products = await mercadoLibreProvider.searchProducts("Galaxy A55");

  assert.deepEqual(products, []);
});
