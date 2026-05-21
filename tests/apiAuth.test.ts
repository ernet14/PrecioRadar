import assert from "node:assert/strict";
import test from "node:test";
import { generateApiKey, hashApiKey } from "../src/lib/apiAuth";
import { API_TIERS, getTierConfig } from "../src/lib/apiTiers";

test("hashApiKey es determinístico y normaliza espacios", () => {
  assert.equal(hashApiKey("pr_live_abc"), hashApiKey("  pr_live_abc  "));
  assert.notEqual(hashApiKey("pr_live_abc"), hashApiKey("pr_live_xyz"));
  // SHA-256 hex => 64 chars
  assert.equal(hashApiKey("pr_live_abc").length, 64);
});

test("generateApiKey emite clave con prefijo y hash coherente", () => {
  const { raw, keyHash, prefix } = generateApiKey();
  assert.ok(raw.startsWith("pr_live_"));
  assert.equal(keyHash, hashApiKey(raw));
  assert.ok(raw.startsWith(prefix));
  assert.equal(prefix.length, "pr_live_".length + 8);
});

test("generateApiKey produce claves únicas", () => {
  const a = generateApiKey();
  const b = generateApiKey();
  assert.notEqual(a.raw, b.raw);
  assert.notEqual(a.keyHash, b.keyHash);
});

test("tiers: límites crecientes y profundidad de historial", () => {
  assert.ok(API_TIERS.FREE.dailyLimit < API_TIERS.PRO.dailyLimit);
  assert.ok(API_TIERS.PRO.dailyLimit < API_TIERS.BUSINESS.dailyLimit);
  assert.equal(getTierConfig("FREE").historyDays, 30);
  assert.equal(getTierConfig("BUSINESS").historyDays, null);
});
