import assert from "node:assert/strict";
import test from "node:test";
import { registerSchema } from "../src/lib/validation/schemas";

const valid = { name: "Fernando Salinas", email: "f@example.com", password: "abcd1234" };

test("acepta un registro válido", () => {
  assert.equal(registerSchema.safeParse(valid).success, true);
});

test("rechaza nombre de una sola letra", () => {
  const r = registerSchema.safeParse({ ...valid, name: "F" });
  assert.equal(r.success, false);
});

test("rechaza nombre sin letras", () => {
  const r = registerSchema.safeParse({ ...valid, name: "12" });
  assert.equal(r.success, false);
});

test("rechaza contraseña corta o sin número", () => {
  assert.equal(registerSchema.safeParse({ ...valid, password: "abc123" }).success, false); // < 8
  assert.equal(registerSchema.safeParse({ ...valid, password: "abcdefgh" }).success, false); // sin número
  assert.equal(registerSchema.safeParse({ ...valid, password: "12345678" }).success, false); // sin letra
});
