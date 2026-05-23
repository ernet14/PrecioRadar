import assert from "node:assert/strict";
import test from "node:test";
import { parseBankPromoText, slugifyEntity } from "../src/services/bankPromoParser";

function localDateKey(date: Date | null | undefined) {
  if (!date) return null;
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

test("slugifyEntity normaliza acentos y espacios", () => {
  assert.equal(slugifyEntity("Banco Nación"), "banco-nacion");
  assert.equal(slugifyEntity("Naranja X"), "naranja-x");
  assert.match(slugifyEntity("Banco Galicia"), /^[a-z0-9-]+$/);
});

test("parsea reintegro con día, tope y medio de pago", () => {
  const draft = parseBankPromoText(
    "Banco Galicia: 25% de reintegro los jueves con tope de $30.000 pagando con tarjeta de crédito.",
  );
  assert.equal(draft.entity, "Banco Galicia");
  assert.equal(draft.entitySlug, "banco-galicia");
  assert.equal(draft.promoType, "refund");
  assert.equal(draft.discountPct, 25);
  assert.equal(draft.maxAmount, 30000);
  assert.deepEqual(draft.dayOfWeek, [4]);
  assert.equal(draft.paymentType, "credito");
});

test("parsea cuotas sin interes", () => {
  const draft = parseBankPromoText("Banco Macro: 6 cuotas sin interés los viernes.");
  assert.equal(draft.entity, "Banco Macro");
  assert.equal(draft.promoType, "installments");
  assert.equal(draft.installments, 6);
  assert.equal(draft.discountPct, null);
  assert.deepEqual(draft.dayOfWeek, [5]);
});

test("'todos los dias' deja dayOfWeek vacio y detecta MODO", () => {
  const draft = parseBankPromoText("MODO 15% todos los días en cualquier comercio.");
  assert.equal(draft.entity, "MODO");
  assert.equal(draft.discountPct, 15);
  assert.deepEqual(draft.dayOfWeek, []);
  assert.equal(draft.paymentType, "modo");
});

test("T&C real: toma el % del beneficio e ignora la TNA, con tope y día", () => {
  const draft = parseBankPromoText(
    "Promo BBVA: 30% de descuento los miércoles en supermercados. Tope de $8.000 por mes. Financiación en cuotas TNA 75%.",
  );
  assert.equal(draft.entity, "BBVA");
  assert.equal(draft.discountPct, 30);
  assert.equal(draft.maxAmount, 8000);
  assert.deepEqual(draft.dayOfWeek, [3]);
  assert.equal(draft.promoType, "percentage");
});

test("'descuento del 25%' (keyword antes del número) también se detecta", () => {
  const draft = parseBankPromoText("Banco Macro: descuento del 25% los sábados. CFT 120%.");
  assert.equal(draft.discountPct, 25);
  assert.deepEqual(draft.dayOfWeek, [6]);
});

test("no confunde 30% con un tope (el tope exige $)", () => {
  const draft = parseBankPromoText("Galicia 30% de ahorro, sin tope.");
  assert.equal(draft.discountPct, 30);
  assert.equal(draft.maxAmount, null);
});

test("'Banco Francés' mapea a BBVA y detecta rango lunes a viernes", () => {
  const draft = parseBankPromoText(
    "Banco Francés: 20% de descuento de lunes a viernes en gastronomía.",
  );
  assert.equal(draft.entity, "BBVA");
  assert.equal(draft.discountPct, 20);
  assert.deepEqual(draft.dayOfWeek, [1, 2, 3, 4, 5]);
});

test("'fin de semana' => sábado y domingo", () => {
  const draft = parseBankPromoText("Galicia 15% los fines de semana.");
  assert.deepEqual(draft.dayOfWeek, [0, 6]);
});

test("cuotas sin interés => installments, sin descuento", () => {
  const draft = parseBankPromoText("Banco Macro: 12 cuotas sin interés en electro.");
  assert.equal(draft.promoType, "installments");
  assert.equal(draft.installments, 12);
  assert.equal(draft.discountPct, null);
});

test("'X pagos sin interés' también cuenta como cuotas", () => {
  const draft = parseBankPromoText("Santander: 6 pagos sin interés.");
  assert.equal(draft.promoType, "installments");
  assert.equal(draft.installments, 6);
});

test("tope con keyword después del monto ($5.000 de tope)", () => {
  const draft = parseBankPromoText("ICBC 25% de reintegro, $5.000 de tope por mes.");
  assert.equal(draft.discountPct, 25);
  assert.equal(draft.maxAmount, 5000);
  assert.equal(draft.promoType, "refund");
});

test("'por ciento' escrito en palabras", () => {
  const draft = parseBankPromoText("Comafi: ahorrá 15 por ciento los martes.");
  assert.equal(draft.discountPct, 15);
  assert.deepEqual(draft.dayOfWeek, [2]);
});

test("texto sin entidad conocida deja entity vacio (revisar a mano)", () => {
  const draft = parseBankPromoText("Promo 10% sin banco identificado.");
  assert.equal(draft.entity, "");
  assert.equal(draft.entitySlug, "");
  assert.equal(draft.discountPct, 10);
});

test("parsea vigencia con rango numerico", () => {
  const draft = parseBankPromoText(
    "BBVA 30% de descuento del 11/05/2026 al 17/05/2026 con tope de $8.000.",
    new Date("2026-05-12T12:00:00"),
  );

  assert.equal(localDateKey(draft.validFrom), "2026-05-11");
  assert.equal(localDateKey(draft.validUntil), "2026-05-17");
});

test("parsea vigencia con rango escrito", () => {
  const draft = parseBankPromoText(
    "Galicia 20% de reintegro del 2 al 8 de noviembre de 2026.",
    new Date("2026-10-20T12:00:00"),
  );

  assert.equal(localDateKey(draft.validFrom), "2026-11-02");
  assert.equal(localDateKey(draft.validUntil), "2026-11-08");
});
