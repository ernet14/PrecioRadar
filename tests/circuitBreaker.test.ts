import assert from "node:assert/strict";
import test from "node:test";
import {
  getCircuitSnapshot,
  isCircuitOpen,
  recordCircuitFailure,
  recordCircuitSuccess,
} from "../src/lib/circuitBreaker";

function randomName(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

test("circuit stays closed under failure threshold", () => {
  const name = randomName("threshold");
  recordCircuitFailure(name, { failureThreshold: 3, resetTimeoutMs: 1000 });
  recordCircuitFailure(name, { failureThreshold: 3, resetTimeoutMs: 1000 });

  assert.equal(isCircuitOpen(name), false);
  assert.equal(getCircuitSnapshot(name)?.state, "closed");
});

test("circuit opens after reaching failure threshold", () => {
  const name = randomName("open");
  const options = { failureThreshold: 3, resetTimeoutMs: 60_000 };

  recordCircuitFailure(name, options);
  recordCircuitFailure(name, options);
  recordCircuitFailure(name, options);

  assert.equal(isCircuitOpen(name, options), true);
  assert.equal(getCircuitSnapshot(name)?.state, "open");
});

test("recordCircuitSuccess resets state to closed", () => {
  const name = randomName("recover");
  const options = { failureThreshold: 2, resetTimeoutMs: 60_000 };

  recordCircuitFailure(name, options);
  recordCircuitFailure(name, options);
  assert.equal(isCircuitOpen(name, options), true);

  recordCircuitSuccess(name);

  const snapshot = getCircuitSnapshot(name);
  assert.equal(snapshot?.state, "closed");
  assert.equal(snapshot?.consecutiveFailures, 0);
  assert.equal(snapshot?.openedAt, null);
});

test("circuit transitions to half-open after reset timeout", async () => {
  const name = randomName("halfopen");
  const options = { failureThreshold: 1, resetTimeoutMs: 50 };

  recordCircuitFailure(name, options);
  assert.equal(isCircuitOpen(name, options), true);

  await new Promise((resolve) => setTimeout(resolve, 80));

  assert.equal(isCircuitOpen(name, options), false);
  assert.equal(getCircuitSnapshot(name)?.state, "half-open");
});
