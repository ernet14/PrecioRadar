import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { createVtexProvider } from "../src/providers/stores/vtexProvider";
import { fravegaProvider as realFravegaProvider } from "../src/providers/stores/fravegaProvider";
import { vtexProviders } from "../src/providers/stores/vtexStores";
import { getCircuitSnapshot } from "../src/lib/circuitBreaker";

// El provider real de Frávega está `blocked` (403 persistente), así que para
// cubrir la normalización VTEX usamos una instancia equivalente sin bloquear.
const fravegaProvider = createVtexProvider({
  name: "fravega",
  storeSlug: "fravega",
  storeName: "Frávega",
  baseUrl: "https://www.fravega.com",
});

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

test("opens the VTEX circuit on scripts-not-allowed blocks", async () => {
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;
  const blockedProvider = createVtexProvider({
    name: "script-block-test",
    storeSlug: "script-block-test",
    storeName: "Script Block Test",
    baseUrl: "https://www.example.com",
  });
  let fetchCount = 0;
  globalThis.fetch = (async () => {
    fetchCount += 1;
    return new Response("Bad Request! Scripts are not allowed!", { status: 400 });
  }) as typeof fetch;

  for (let index = 0; index < 5; index += 1) {
    assert.deepEqual(await blockedProvider.searchProducts("Galaxy A55"), []);
  }

  assert.equal(getCircuitSnapshot("vtex:script-block-test")?.state, "open");
  assert.deepEqual(await blockedProvider.searchProducts("Galaxy A55"), []);
  assert.equal(fetchCount, 5);
});

test("the real Fravega provider is blocked and does not hit the network", async () => {
  let fetched = false;
  globalThis.fetch = (async () => {
    fetched = true;
    return new Response("[]", { headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  assert.equal(realFravegaProvider.blocked, true);
  assert.deepEqual(await realFravegaProvider.searchProducts("Galaxy A55"), []);
  assert.equal(
    await realFravegaProvider.getProductByUrl(
      "https://www.fravega.com/x-990353710/p",
    ),
    null,
  );
  assert.equal(await realFravegaProvider.getCurrentPrice({ externalId: "990353710" }), null);
  assert.equal(fetched, false);
});

test("vtex registry exposes the expected AR stores", () => {
  const names = vtexProviders.map((p) => p.name).sort();
  assert.deepEqual(names, [
    "carrefour",
    "cetrogar",
    "coppel",
    "desiderata",
    "dia",
    "easy",
    "fravega",
    "grid",
    "jumbo",
    "masonline",
    "mimo",
    "naldo",
    "newsport",
    "oncity",
    "portsaid",
    "sportotal",
    "vea",
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
