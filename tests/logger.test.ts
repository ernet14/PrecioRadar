import assert from "node:assert/strict";
import test from "node:test";
import { logger } from "../src/lib/logger";

function captureConsole(method: "log" | "warn" | "error"): {
  captured: string[];
  restore: () => void;
} {
  const captured: string[] = [];
  const original = console[method];
  console[method] = (...args: unknown[]) => {
    captured.push(args.map((arg) => String(arg)).join(" "));
  };
  return {
    captured,
    restore() {
      console[method] = original;
    },
  };
}

test("logger.info emits valid JSON with timestamp and level", () => {
  const { captured, restore } = captureConsole("log");

  try {
    logger.info("test message", {
      metadata: { foo: "bar" },
      route: "test.route",
    });
  } finally {
    restore();
  }

  assert.equal(captured.length, 1);
  const payload = JSON.parse(captured[0]);
  assert.equal(payload.level, "info");
  assert.equal(payload.message, "test message");
  assert.equal(payload.route, "test.route");
  assert.deepEqual(payload.metadata, { foo: "bar" });
  assert.ok(payload["@timestamp"]);
});

test("logger.error serializes Error instances", () => {
  const { captured, restore } = captureConsole("error");

  try {
    logger.error("boom", { error: new Error("inner failure") });
  } finally {
    restore();
  }

  const payload = JSON.parse(captured[0]);
  assert.equal(payload.level, "error");
  assert.equal(payload.error.message, "inner failure");
  assert.equal(payload.error.name, "Error");
  assert.ok(payload.error.stack);
});

test("logger hashes user id to non-reversible 12 chars", () => {
  const { captured, restore } = captureConsole("log");

  try {
    logger.info("user event", { userId: "11111111-2222-3333-4444-555555555555" });
  } finally {
    restore();
  }

  const payload = JSON.parse(captured[0]);
  assert.equal(typeof payload.userIdHash, "string");
  assert.equal(payload.userIdHash.length, 12);
  assert.notEqual(payload.userIdHash, "11111111-2222-3333-4444-555555555555");
});

test("logger omits empty optional fields", () => {
  const { captured, restore } = captureConsole("log");

  try {
    logger.info("bare message");
  } finally {
    restore();
  }

  const payload = JSON.parse(captured[0]);
  assert.equal("route" in payload, false);
  assert.equal("userIdHash" in payload, false);
  assert.equal("error" in payload, false);
});
