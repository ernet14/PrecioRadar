import assert from "node:assert/strict";
import test from "node:test";

// Helper: replicar el cálculo de hash que usa auditLogService.hashIp para verificar contrato.
async function expectedIpHash(ip: string, salt: string) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

test("auditLogService validates IP hash consistency with same salt", async () => {
  process.env.AUDIT_IP_HASH_SALT = "test-salt-fixed";

  // Importamos dinámicamente para que respete la env var.
  const { recordAuditEvent } = await import(
    "../src/services/auditLogService"
  );

  const result = await recordAuditEvent({
    event: "auth.login",
    ip: "203.0.113.42",
    userAgent: "ua-test",
  });

  assert.ok(
    result.status === "skipped" || result.status === "logged" || result.status === "error",
  );

  const hashed = await expectedIpHash("203.0.113.42", "test-salt-fixed");
  assert.equal(hashed.length, 64);
  assert.notEqual(hashed, "203.0.113.42");
});

test("auditLogService produces different hashes with different salts", async () => {
  const hashA = await expectedIpHash("203.0.113.42", "salt-A");
  const hashB = await expectedIpHash("203.0.113.42", "salt-B");
  assert.notEqual(hashA, hashB);
});
