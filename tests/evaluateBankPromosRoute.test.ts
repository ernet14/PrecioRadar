import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  GET,
  POST,
} from "../src/app/api/internal/evaluate-bank-promos/route";

const originalCronSecret = process.env.CRON_SECRET;
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalDirectUrl = process.env.DIRECT_URL;

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

function createRequest(headers?: HeadersInit) {
  return new Request("http://localhost/api/internal/evaluate-bank-promos", {
    headers,
  });
}

function clearDatabaseEnv() {
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;
}

afterEach(() => {
  restoreEnv("CRON_SECRET", originalCronSecret);
  restoreEnv("DATABASE_URL", originalDatabaseUrl);
  restoreEnv("DIRECT_URL", originalDirectUrl);
});

test("rejects bank promo evaluation when CRON_SECRET is missing", async () => {
  delete process.env.CRON_SECRET;

  const response = await GET(createRequest());
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.status, "error");
  assert.equal(body.reason, "missing_cron_secret");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("rejects bank promo evaluation when the secret does not match", async () => {
  process.env.CRON_SECRET = "test-secret";
  clearDatabaseEnv();

  const response = await GET(
    createRequest({ authorization: "Bearer wrong-secret" }),
  );
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.status, "error");
  assert.equal(body.reason, "unauthorized");
});

test("returns unavailable when bank promo bot has no database", async () => {
  process.env.CRON_SECRET = "test-secret";
  clearDatabaseEnv();

  const response = await POST(createRequest({ "x-cron-secret": "test-secret" }));
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.status, "database_unavailable");
});
