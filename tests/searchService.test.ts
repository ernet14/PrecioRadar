import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { searchProducts } from "../src/services/searchService";

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
});

test("labels real MercadoLibre best offers without demo copy", async () => {
  process.env.MERCADOLIBRE_ACCESS_TOKEN = "test-token";
  mockJsonFetch(() => ({
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
  }));

  const result = await searchProducts("Samsung Galaxy A55");
  const recommendation = result.exactMatches[0]?.product.recommendation;

  assert.equal(result.usedDemoFallback, false);
  assert.equal(recommendation?.label, "Mejor precio");
  assert.equal(
    recommendation?.reason,
    "Resultado disponible desde el provider configurado.",
  );
});
