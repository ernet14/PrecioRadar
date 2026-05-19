import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

const moduleId = "../src/lib/mercadolibre/oauth";
const storageModuleId = "../src/lib/mercadolibre/authStorage";

const originalFetch = globalThis.fetch;
const originalEnv = {
  clientId: process.env.MERCADOLIBRE_CLIENT_ID,
  clientSecret: process.env.MERCADOLIBRE_CLIENT_SECRET,
  redirectUri: process.env.MERCADOLIBRE_REDIRECT_URI,
  accessToken: process.env.MERCADOLIBRE_ACCESS_TOKEN,
  databaseUrl: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_URL,
};

function setEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

function clearModuleCache() {
  for (const id of Object.keys(require.cache)) {
    if (id.includes("mercadolibre") || id.includes("authStorage")) {
      delete require.cache[id];
    }
  }
}

beforeEach(() => {
  process.env.MERCADOLIBRE_CLIENT_ID = "test-client-id";
  process.env.MERCADOLIBRE_CLIENT_SECRET = "test-client-secret";
  process.env.MERCADOLIBRE_REDIRECT_URI =
    "https://example.com/api/auth/mercadolibre/callback";
  delete process.env.MERCADOLIBRE_ACCESS_TOKEN;
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;
  clearModuleCache();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  setEnv("MERCADOLIBRE_CLIENT_ID", originalEnv.clientId);
  setEnv("MERCADOLIBRE_CLIENT_SECRET", originalEnv.clientSecret);
  setEnv("MERCADOLIBRE_REDIRECT_URI", originalEnv.redirectUri);
  setEnv("MERCADOLIBRE_ACCESS_TOKEN", originalEnv.accessToken);
  setEnv("DATABASE_URL", originalEnv.databaseUrl);
  setEnv("DIRECT_URL", originalEnv.directUrl);
  clearModuleCache();
});

test("buildAuthorizationUrl includes client_id, redirect_uri and state", async () => {
  const { buildAuthorizationUrl } = await import(moduleId);
  const url = buildAuthorizationUrl("xyz-state");
  assert.ok(url);
  const parsed = new URL(url!);
  assert.equal(parsed.host, "auth.mercadolibre.com.ar");
  assert.equal(parsed.searchParams.get("response_type"), "code");
  assert.equal(parsed.searchParams.get("client_id"), "test-client-id");
  assert.equal(
    parsed.searchParams.get("redirect_uri"),
    "https://example.com/api/auth/mercadolibre/callback",
  );
  assert.equal(parsed.searchParams.get("state"), "xyz-state");
});

test("buildAuthorizationUrl returns null when creds missing", async () => {
  delete process.env.MERCADOLIBRE_CLIENT_ID;
  const { buildAuthorizationUrl } = await import(moduleId);
  assert.equal(buildAuthorizationUrl("s"), null);
});

test("exchangeCodeForTokens returns null when MeLi responds with HTTP error", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: "invalid_grant" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  const { exchangeCodeForTokens } = await import(moduleId);
  const result = await exchangeCodeForTokens("bad-code");
  assert.equal(result, null);
});

test("exchangeCodeForTokens returns null when persistence fails (no DB)", async () => {
  // Sin DATABASE_URL, writeMercadoLibreAuth devuelve false aunque MeLi
  // responda OK. La funcion debe reflejar fallo.
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        access_token: "AT-1",
        refresh_token: "RT-1",
        expires_in: 21600,
        user_id: 12345,
        scope: "read write",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    )) as typeof fetch;

  const { exchangeCodeForTokens } = await import(moduleId);
  const result = await exchangeCodeForTokens("good-code");
  assert.equal(result, null);
});

test("getMercadoLibreToken prefers static env token over DB", async () => {
  process.env.MERCADOLIBRE_ACCESS_TOKEN = "STATIC-TOKEN";
  const { getMercadoLibreToken } = await import(moduleId);
  const token = await getMercadoLibreToken();
  assert.equal(token, "STATIC-TOKEN");
});

test("getMercadoLibreToken returns null when no static token and no DB record", async () => {
  // Sin DB configurada y sin token estatico, no hay token.
  const { getMercadoLibreToken } = await import(moduleId);
  const token = await getMercadoLibreToken();
  assert.equal(token, null);
});

test("getMercadoLibreToken treats placeholder env value as absent", async () => {
  process.env.MERCADOLIBRE_ACCESS_TOKEN = "[MERCADOLIBRE_ACCESS_TOKEN]";
  const { getMercadoLibreToken } = await import(moduleId);
  const token = await getMercadoLibreToken();
  assert.equal(token, null);
});

void storageModuleId;
