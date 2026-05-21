import assert from "node:assert/strict";
import test from "node:test";
import { aggregateRatings, moderateReviewBody } from "../src/services/reviewService";

test("moderateReviewBody acepta una reseña válida", () => {
  assert.deepEqual(
    moderateReviewBody("Muy buen producto, la batería dura todo el día."),
    { ok: true },
  );
});

test("moderateReviewBody rechaza textos muy cortos", () => {
  const result = moderateReviewBody("ok");
  assert.equal(result.ok, false);
});

test("moderateReviewBody rechaza enlaces y datos de contacto", () => {
  assert.equal(moderateReviewBody("Compralo en http://spam.test ahora").ok, false);
  assert.equal(moderateReviewBody("escribime a juan@mail.com por favor").ok, false);
});

test("moderateReviewBody rechaza lenguaje no permitido y spam", () => {
  assert.equal(moderateReviewBody("esto es una mierda total no sirve").ok, false);
  assert.equal(moderateReviewBody("holaaaaaaaaaaaaaaa que tal todo bien").ok, false);
});

test("aggregateRatings promedia y cuenta", () => {
  assert.deepEqual(aggregateRatings([5, 4, 3]), { average: 4, count: 3 });
  assert.deepEqual(aggregateRatings([5, 4]), { average: 4.5, count: 2 });
  assert.deepEqual(aggregateRatings([]), { average: 0, count: 0 });
});
