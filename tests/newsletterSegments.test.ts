import assert from "node:assert/strict";
import test from "node:test";
import {
  newsletterSegments,
  normalizeSegments,
} from "../src/data/newsletterSegments";

test("normalizeSegments filtra slugs inválidos y deduplica", () => {
  assert.deepEqual(
    normalizeSegments(["cazadores-ofertas", "inexistente", "cazadores-ofertas"]),
    ["cazadores-ofertas"],
  );
});

test("normalizeSegments acepta todos los slugs válidos", () => {
  const all = newsletterSegments.map((segment) => segment.slug);
  assert.deepEqual(normalizeSegments(all), all);
});

test("normalizeSegments devuelve vacío para entrada vacía o basura", () => {
  assert.deepEqual(normalizeSegments([]), []);
  assert.deepEqual(normalizeSegments(["", "x", "123"]), []);
});
