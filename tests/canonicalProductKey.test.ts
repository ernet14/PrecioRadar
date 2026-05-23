import assert from "node:assert/strict";
import test from "node:test";
import { getCanonicalProductKey, getPhoneCanonicalKey, normalizeEan } from "../src/lib/utils/text";

test("EAN agrupa el mismo producto aunque el título y la marca difieran", () => {
  const carrefour = getCanonicalProductKey({
    name: "Gaseosa Coca-Cola 2.25L",
    brand: "Coca Cola",
    ean: "7790895000997",
  });
  const jumbo = getCanonicalProductKey({
    name: "Coca Cola Sabor Original 2,25 Lt",
    brand: "Coca-Cola",
    ean: "7790895000997",
  });

  assert.equal(carrefour, jumbo);
  assert.equal(carrefour, "ean-7790895000997");
});

test("EAN tiene prioridad sobre el SKU del nombre", () => {
  const key = getCanonicalProductKey({
    name: "LG Smart TV 55 55UP7750PSB 4K",
    brand: "LG",
    ean: "8806091234567",
  });
  assert.equal(key, "ean-8806091234567");
});

test("EAN inválido (corto o todo ceros) se ignora y cae al SKU", () => {
  const key = getCanonicalProductKey({
    name: "LG Smart TV 55 55UP7750PSB 4K",
    brand: "LG",
    ean: "0000000000000",
  });
  assert.equal(key, "lg-55up7750psb");
});

test("normalizeEan limpia separadores y valida longitud", () => {
  assert.equal(normalizeEan("779-089 500 0997"), "7790895000997");
  assert.equal(normalizeEan("123"), null);
  assert.equal(normalizeEan(null), null);
});

test("normalizeEan unifica el padding GTIN-14 (cero a la izquierda) con la forma corta", () => {
  // Una tienda expone "07796962002314" (14 díg.) y otra "7796962002314" (13): mismo producto.
  assert.equal(normalizeEan("07796962002314"), "7796962002314");
  assert.equal(normalizeEan("07796962002314"), normalizeEan("7796962002314"));
  // No toca EAN-8 ni el caso normal de 13 díg. sin padding.
  assert.equal(normalizeEan("8806097300984"), "8806097300984");
});

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

test("celular: agrupa por marca+modelo+capacidad pero NO mezcla capacidades", () => {
  const gb128 = getCanonicalProductKey({ name: "Samsung Galaxy A55 5G 128GB", brand: "Samsung" });
  const gb256 = getCanonicalProductKey({ name: "Samsung Galaxy A55 5G 256GB", brand: "Samsung" });

  assert.equal(gb128, "phone-samsung-a55-128");
  assert.equal(gb256, "phone-samsung-a55-256");
  assert.notEqual(gb128, gb256); // 128 != 256 siguen separados.
});

test("celular: el mismo modelo+capacidad agrupa entre tiendas (ignora color y EAN por-variante)", () => {
  // Títulos reales de Naldo y Carrefour (la sonda los trajo con EANs vacíos o distintos).
  const naldo = getCanonicalProductKey({ name: "Celular Samsung Galaxy A15 4GB 128GB Black", brand: "Samsung" });
  const carrefour = getCanonicalProductKey({ name: "Celular  Samsung Galaxy A15 128GB 4GB RAM", brand: "Samsung", ean: "0000000000000" });
  assert.equal(naldo, "phone-samsung-a15-128");
  assert.equal(carrefour, "phone-samsung-a15-128");
});

test("celular: variantes con sufijo (S24 Ultra) agrupan entre 3 tiendas con storage en formatos distintos", () => {
  const coppel = getCanonicalProductKey({ name: "Celular Samsung S24 Ultra 12GB 256GB Gris", brand: "Samsung" });
  const carrefour = getCanonicalProductKey({ name: "Celular Samsung Galaxy S24 Ultra 12/256 GB 5G", brand: "Samsung" });
  const jumbo = getCanonicalProductKey({ name: "Celular Samsung Galaxy S24 Ultra 256gb Titanium", brand: "Samsung", ean: "8806095316888" });
  assert.equal(coppel, "phone-samsung-s24-ultra-256");
  assert.equal(carrefour, "phone-samsung-s24-ultra-256");
  assert.equal(jumbo, "phone-samsung-s24-ultra-256"); // gana sobre el EAN.
});

test("celular: Motorola, Xiaomi y Apple agrupan por modelo+capacidad", () => {
  assert.equal(getCanonicalProductKey({ name: "Celular Motorola G24 4GB 128GB Gris", brand: "Motorola" }), "phone-motorola-g24-128");
  assert.equal(getCanonicalProductKey({ name: "Celular Motorola Moto G24 6.6  4GB Ram 128GB Pink", brand: "Motorola" }), "phone-motorola-g24-128");
  assert.equal(getCanonicalProductKey({ name: "Celular Motorola Edge 50 Fusion 8GB 256GB Celeste", brand: "Motorola" }), "phone-motorola-edge-50-fusion-256");
  assert.equal(getCanonicalProductKey({ name: "Celular libre Motorola Edge 50 fusion 8gb 256gb", brand: "Motorola" }), "phone-motorola-edge-50-fusion-256");
  assert.equal(getCanonicalProductKey({ name: "Celular Xiaomi Redmi Note 13 4G 6 Gb 128 Gb Verde", brand: "Xiaomi", ean: "6941812763858" }), "phone-xiaomi-redmi-note-13-128");
  assert.equal(getCanonicalProductKey({ name: "Celular libre Xiaomi redmi note 13 6gb 128 gb azul", brand: "Xiaomi" }), "phone-xiaomi-redmi-note-13-128");
  assert.equal(getCanonicalProductKey({ name: 'IPhone 15 Apple 6.1" 128Gb Negro', brand: "Apple", ean: "195949034701" }), "phone-apple-iphone-15-128");
  assert.equal(getCanonicalProductKey({ name: "Celular iPhone 15 128gb", brand: "Apple" }), "phone-apple-iphone-15-128");
});

test("celular: capacidad en formato '256/8gb' (gb solo en la RAM) se detecta", () => {
  // Título real de Carrefour electro: "Edge 50 FUSION 5g 256/8gb" → norm "256 8gb".
  const key = getCanonicalProductKey({ name: "Celular Motorola Moto Edge 50 FUSION 5g 256/8gb", brand: "Motorola" });
  assert.equal(key, "phone-motorola-edge-50-fusion-256");
});

test("celular sin capacidad confiable: cae al EAN (no inventa clave de modelo)", () => {
  // Título real de Cetrogar: trae RAM (6GB) pero no almacenamiento.
  const key = getCanonicalProductKey({ name: "Celular Xiaomi Redmi Note 13 6.6'' 6GB negro", brand: "Xiaomi", ean: "6941812764015" });
  assert.equal(key, "ean-6941812764015");
});

test("accesorio de celular NO recibe clave de teléfono", () => {
  assert.equal(getPhoneCanonicalKey({ name: "Funda para Samsung Galaxy A15 5G flores", brand: "Samsung" }), null);
  assert.equal(getPhoneCanonicalKey({ name: "Bandeja de tarjeta SIM para Samsung Galaxy A15 5G", brand: "Samsung" }), null);
  assert.equal(getPhoneCanonicalKey({ name: "Smartwatch Samsung Galaxy Watch8 128GB", brand: "Samsung" }), null);
});

test("TV Samsung con EAN sigue agrupando por EAN (no es teléfono)", () => {
  const key = getCanonicalProductKey({ name: "Smart TV LED 50'' Samsung Crystal UHD 4K U8000F", brand: "Samsung", ean: "8806097300984" });
  assert.equal(key, "ean-8806097300984");
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
