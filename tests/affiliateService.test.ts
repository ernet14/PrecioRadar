import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  buildProgramAffiliateUrl,
  getProgramAffiliateTag,
  normalizeAffiliateProgram,
  supportsAutoTagging,
} from "../src/services/affiliateService";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

test("normalizeAffiliateProgram default y desconocido", () => {
  assert.equal(normalizeAffiliateProgram(undefined), "mercadolibre");
  assert.equal(normalizeAffiliateProgram(null), "mercadolibre");
  assert.equal(normalizeAffiliateProgram("AWIN"), "awin");
  assert.equal(normalizeAffiliateProgram("amazon"), "amazon");
  assert.equal(normalizeAffiliateProgram("programa-raro"), "none");
});

test("supportsAutoTagging distingue query-param vs deeplink", () => {
  assert.equal(supportsAutoTagging("mercadolibre"), true);
  assert.equal(supportsAutoTagging("amazon"), true);
  assert.equal(supportsAutoTagging("awin"), false); // deeplink manual
  assert.equal(supportsAutoTagging("none"), false);
});

test("buildProgramAffiliateUrl usa el parámetro correcto por programa", () => {
  assert.equal(
    buildProgramAffiliateUrl({
      program: "mercadolibre",
      productUrl: "https://www.mercadolibre.com.ar/MLA-123-_JM",
      tag: "precioradar",
    }),
    "https://www.mercadolibre.com.ar/MLA-123-_JM?custom_id=precioradar",
  );
  assert.equal(
    buildProgramAffiliateUrl({
      program: "amazon",
      productUrl: "https://www.amazon.com/dp/B000",
      tag: "precioradar-20",
    }),
    "https://www.amazon.com/dp/B000?tag=precioradar-20",
  );
});

test("buildProgramAffiliateUrl devuelve null para deeplink, sin tag o URL inválida", () => {
  assert.equal(
    buildProgramAffiliateUrl({
      program: "awin",
      productUrl: "https://falabella.com/x",
      tag: "12345",
    }),
    null,
  );
  assert.equal(
    buildProgramAffiliateUrl({
      program: "amazon",
      productUrl: "https://www.amazon.com/dp/B000",
      tag: "",
    }),
    null,
  );
  assert.equal(
    buildProgramAffiliateUrl({
      program: "amazon",
      productUrl: "no-es-una-url",
      tag: "precioradar-20",
    }),
    null,
  );
});

test("getProgramAffiliateTag lee la env var de cada programa", () => {
  process.env.AMAZON_AFFILIATE_TAG = "precioradar-20";
  process.env.MERCADOLIBRE_AFFILIATE_TAG = "  precioradar  ";
  delete process.env.TEMU_AFFILIATE_TAG;

  assert.equal(getProgramAffiliateTag("amazon"), "precioradar-20");
  assert.equal(getProgramAffiliateTag("mercadolibre"), "precioradar");
  assert.equal(getProgramAffiliateTag("temu"), undefined);
  assert.equal(getProgramAffiliateTag("none"), undefined);
});
