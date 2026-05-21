import assert from "node:assert/strict";
import test from "node:test";
import { parseBankPromoText, slugifyEntity } from "../src/services/bankPromoParser";

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

test("texto sin entidad conocida deja entity vacio (revisar a mano)", () => {
  const draft = parseBankPromoText("Promo 10% sin banco identificado.");
  assert.equal(draft.entity, "");
  assert.equal(draft.entitySlug, "");
  assert.equal(draft.discountPct, 10);
});
