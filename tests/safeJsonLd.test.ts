import { test } from "node:test";
import assert from "node:assert/strict";
import { safeJsonLd } from "../src/lib/seo/safeJsonLd";

const LS = String.fromCharCode(0x2028); // U+2028 LINE SEPARATOR
const PS = String.fromCharCode(0x2029); // U+2029 PARAGRAPH SEPARATOR

test("safeJsonLd neutraliza el cierre de </script> en contenido de usuario", () => {
  const payload = { body: "</script><script>alert(1)</script>" };
  const out = safeJsonLd(payload);

  assert.ok(!out.includes("</script>"), "no debe contener </script> literal");
  assert.ok(!out.includes("<script>"), "no debe contener <script> literal");
  assert.ok(out.includes("\\u003c"), "el < debe quedar escapado como \\u003c");
});

test("safeJsonLd escapa < > & y mantiene JSON parseable equivalente", () => {
  const payload = { name: "Pava & cocina <b>oferta</b>", price: 1000 };
  const out = safeJsonLd(payload);

  assert.ok(!out.includes("<"), "sin < literal");
  assert.ok(!out.includes(">"), "sin > literal");
  assert.ok(!out.includes("&"), "sin & literal");
  // El escape \uXXXX es JSON válido: al parsear se recupera el valor original.
  assert.deepEqual(JSON.parse(out), payload);
});

test("safeJsonLd escapa los separadores de línea Unicode U+2028 / U+2029", () => {
  const payload = { body: `linea1${LS}linea2${PS}fin` };
  const out = safeJsonLd(payload);

  assert.ok(!out.includes(LS), "sin U+2028 literal");
  assert.ok(!out.includes(PS), "sin U+2029 literal");
  assert.ok(out.includes("\\u2028") && out.includes("\\u2029"));
  assert.deepEqual(JSON.parse(out), payload);
});
