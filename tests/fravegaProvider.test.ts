import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { fravegaProvider } from "../src/providers/stores/fravegaProvider";
import { vtexProviders } from "../src/providers/stores/vtexStores";

const originalFetch = globalThis.fetch;
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalDirectUrl = process.env.DIRECT_URL;

function mockFetch(
  handler: (input: RequestInfo | URL) => unknown,
  status = 200,
) {
  globalThis.fetch = (async (input) => {
    return new Response(JSON.stringify(handler(input)), {
      headers: { "content-type": "application/json" },
      status,
    });
  }) as typeof fetch;
}

const vtexProduct = {
  productId: "990353710",
  productName: "Samsung Galaxy A55 5G 256GB Negro",
  brand: "Samsung",
  link: "https://www.fravega.com/samsung-galaxy-a55-5g-256gb-990353710/p",
  categories: ["/Celulares/Telefonia/"],
  items: [
    {
      itemId: "990183798",
      images: [{ imageUrl: "https://fravega.vteximg.com.br/arquivos/ids/45318002/x.jpg" }],
      sellers: [
        {
          commertialOffer: {
            Price: 799999,
            ListPrice: 899999,
            IsAvailable: true,
            AvailableQuantity: 5,
          },
        },
      ],
    },
  ],
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalDirectUrl === undefined) delete process.env.DIRECT_URL;
  else process.env.DIRECT_URL = originalDirectUrl;
});

test("searches Fravega via VTEX and normalizes real prices", async () => {
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;
  let requestedUrl = "";
  mockFetch((input) => {
    requestedUrl = String(input);
    return [vtexProduct];
  });

  const products = await fravegaProvider.searchProducts("Samsung Galaxy A55");

  assert.match(requestedUrl, /\/api\/catalog_system\/pub\/products\/search\//);
  assert.equal(products.length, 1);
  assert.equal(products[0].externalId, "990353710");
  assert.equal(products[0].storeSlug, "fravega");
  assert.equal(products[0].brand, "Samsung");
  assert.equal(products[0].price, 799999);
  assert.equal(products[0].currency, "ARS");
  assert.equal(products[0].available, true);
  assert.equal(products[0].condition, "NEW");
  assert.equal(products[0].isDemo, false);
  assert.equal(products[0].categorySlug, "celulares");
  assert.equal(
    products[0].productUrl,
    "https://www.fravega.com/samsung-galaxy-a55-5g-256gb-990353710/p",
  );
});

test("returns empty when Fravega responds with a non-array body", async () => {
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;
  mockFetch(() => ({ error: "unexpected" }));

  const products = await fravegaProvider.searchProducts("Galaxy A55");

  assert.deepEqual(products, []);
});

test("returns empty on Fravega HTTP error", async () => {
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;
  mockFetch(() => ({ message: "boom" }), 500);

  const products = await fravegaProvider.searchProducts("Galaxy A55");

  assert.deepEqual(products, []);
});

test("vtex registry exposes the expected AR stores", () => {
  const names = vtexProviders.map((p) => p.name).sort();
  assert.deepEqual(names, [
    "carrefour",
    "cetrogar",
    "coppel",
    "easy",
    "fravega",
    "jumbo",
    "naldo",
    "oncity",
  ]);
});

test("resolves a Fravega product URL through productId", async () => {
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;
  let requestedUrl = "";
  mockFetch((input) => {
    requestedUrl = String(input);
    return [vtexProduct];
  });

  const product = await fravegaProvider.getProductByUrl(
    "https://www.fravega.com/samsung-galaxy-a55-5g-256gb-990353710/p",
  );

  assert.match(requestedUrl, /fq=productId:990353710/);
  assert.equal(product?.externalId, "990353710");
  assert.equal(product?.price, 799999);
});
