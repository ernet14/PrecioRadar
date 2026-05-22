import assert from "node:assert/strict";
import test from "node:test";
import {
  extractFirstUrl,
  htmlToText,
  isAllowedBankUrl,
} from "../src/services/bankPromoFetcher";

test("extractFirstUrl saca la primera URL del texto", () => {
  assert.equal(
    extractFirstUrl("Mirá esta promo https://www.bbva.com.ar/promos/x y avisame"),
    "https://www.bbva.com.ar/promos/x",
  );
  assert.equal(extractFirstUrl("sin links acá"), null);
});

test("isAllowedBankUrl acepta bancos AR y rechaza el resto / IPs privadas", () => {
  assert.equal(isAllowedBankUrl("https://www.bbva.com.ar/promociones/abc"), true);
  assert.equal(isAllowedBankUrl("https://galicia.ar/promo"), true);
  assert.equal(isAllowedBankUrl("https://www.mercadopago.com.ar/promo"), true);
  assert.equal(isAllowedBankUrl("https://evil.example.com/x"), false);
  assert.equal(isAllowedBankUrl("http://127.0.0.1/x"), false);
  assert.equal(isAllowedBankUrl("ftp://bbva.com.ar/x"), false);
  assert.equal(isAllowedBankUrl("not a url"), false);
});

test("htmlToText limpia tags/scripts y levanta meta description", () => {
  const html = `<html><head>
    <meta name="description" content="25% de reintegro los jueves">
    <style>.x{color:red}</style></head>
    <body><script>var a=1</script><h1>Promo</h1><p>Tope &amp; $5.000</p></body></html>`;
  const text = htmlToText(html);
  assert.match(text, /25% de reintegro los jueves/);
  assert.match(text, /Promo/);
  assert.match(text, /Tope & \$5\.000/);
  assert.doesNotMatch(text, /var a=1/);
  assert.doesNotMatch(text, /color:red/);
});
