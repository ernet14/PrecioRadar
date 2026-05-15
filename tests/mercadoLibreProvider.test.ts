import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { mercadoLibreProvider } from "../src/providers/stores/mercadoLibreProvider";

const originalFetch = globalThis.fetch;

function mockJsonFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => unknown,
) {
  globalThis.fetch = (async (input, init) => {
    return new Response(JSON.stringify(handler(input, init)), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.MERCADOLIBRE_ACCESS_TOKEN;
  delete process.env.MERCADOLIBRE_SITE_ID;
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
  assert.equal(authorizationHeader, "Bearer test-token");
  assert.equal(products.length, 1);
  assert.equal(products[0].externalId, "MLA123456789");
  assert.equal(products[0].brand, "Samsung");
  assert.equal(products[0].model, "Galaxy A55");
  assert.equal(products[0].condition, "NEW");
  assert.equal(products[0].isDemo, false);
});

test("resolves a MercadoLibre item URL through the item endpoint", async () => {
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
