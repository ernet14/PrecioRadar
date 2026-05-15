import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  getProviderErrorMessage,
  recordProviderLog,
} from "../src/services/providerLogService";

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

test("formats provider errors safely", () => {
  assert.equal(getProviderErrorMessage(new Error("timeout")), "timeout");
  assert.equal(getProviderErrorMessage("bad response"), "bad response");
  assert.equal(getProviderErrorMessage(null), "Error desconocido del provider.");
});

test("skips provider logs when database is unavailable", async () => {
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;

  const result = await recordProviderLog({
    action: "searchProducts",
    errorMessage: "HTTP 500 desde MercadoLibre.",
    provider: "mercadolibre",
    status: "failed",
    storeSlug: "mercadolibre",
  });

  assert.equal(result.status, "skipped");
});
