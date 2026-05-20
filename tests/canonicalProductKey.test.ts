import assert from "node:assert/strict";
import test from "node:test";
import { getCanonicalProductKey } from "../src/lib/utils/text";

test("agrupa el mismo SKU entre tiendas que lo nombran distinto", () => {
  const oncity = getCanonicalProductKey({
    name: "Notebook Lenovo Ideapad Slim 3 15AMN8 82XQ00TCAR AMD R5",
    brand: "Lenovo",
  });
  const fravega = getCanonicalProductKey({
    name: "Lenovo IdeaPad Slim 3 AMD Ryzen 5 82XQ00TCAR",
    brand: "Lenovo",
  });

  assert.equal(oncity, fravega);
  assert.equal(oncity, "lenovo-82xq00tcar");
});

test("usa el token más largo (SKU específico) y no la familia corta", () => {
  const key = getCanonicalProductKey({
    name: "LG Smart TV 55 55UP7750PSB 4K",
    brand: "LG",
  });

  assert.equal(key, "lg-55up7750psb");
});

test("NO agrupa variantes de capacidad distintas (token corto < 6)", () => {
  const gb128 = getCanonicalProductKey({
    name: "Samsung Galaxy A55 5G 128GB",
    brand: "Samsung",
  });
  const gb256 = getCanonicalProductKey({
    name: "Samsung Galaxy A55 5G 256GB",
    brand: "Samsung",
  });

  // Sin SKU largo confiable => null en ambos => caen al nombre normalizado.
  assert.equal(gb128, null);
  assert.equal(gb256, null);
});

test("devuelve null cuando no hay SKU alfanumérico confiable", () => {
  assert.equal(
    getCanonicalProductKey({ name: "Licuadora Philips", brand: "Philips" }),
    null,
  );
});

test("funciona sin marca usando solo el SKU", () => {
  assert.equal(
    getCanonicalProductKey({ name: "Notebook 82XQ00TCAR", brand: null }),
    "82xq00tcar",
  );
});

test("ignora dígitos puros y letras puras como SKU", () => {
  // "2024" (solo dígitos) y "ultrawide" (solo letras) no son SKU.
  assert.equal(
    getCanonicalProductKey({ name: "Monitor Ultrawide 2024", brand: "Dell" }),
    null,
  );
});
