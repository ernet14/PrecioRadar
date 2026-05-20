import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeProductImportUrl,
  suggestCategorySlug,
} from "../src/services/productImportService";

test("detecta MercadoLibre, limpia tracking y sugiere datos desde el slug", () => {
  const analysis = analyzeProductImportUrl(
    "https://www.mercadolibre.com.ar/MLA-123456789-notebook-lenovo-ideapad-slim-3-15amn8-_JM?utm_source=mail&gclid=abc&color=gris",
  );

  assert.equal(analysis.detectedStoreSlug, "mercadolibre");
  assert.equal(analysis.detectedStoreName, "MercadoLibre");
  assert.equal(analysis.sourceDomain, "mercadolibre.com.ar");
  assert.equal(analysis.shortUrl, false);
  assert.equal(analysis.normalizedUrl?.includes("utm_source"), false);
  assert.equal(analysis.normalizedUrl?.includes("gclid"), false);
  assert.equal(analysis.normalizedUrl?.includes("color=gris"), true);
  assert.equal(analysis.suggestedSlug, "notebook-lenovo-ideapad-slim-3-15amn8");
  assert.equal(analysis.suggestedTitle, "Notebook Lenovo Ideapad Slim 3 15amn8");
  assert.equal(analysis.suggestedCategorySlug, "notebooks");
  assert.equal(analysis.fieldSources.productName, "auto");
});

test("marca links cortos de meli.la como no expandidos", () => {
  const analysis = analyzeProductImportUrl("https://meli.la/ABC123");

  assert.equal(analysis.detectedStoreSlug, "mercadolibre");
  assert.equal(analysis.shortUrl, true);
  assert.equal(analysis.unexpandedShortUrl, true);
  assert.equal(analysis.suggestedSlug, null);
  assert.equal(analysis.suggestedTitle, null);
});

test("detecta tiendas conocidas sin depender de scraping", () => {
  const analysis = analyzeProductImportUrl(
    "https://www.fravega.com/p/celular-motorola-moto-g85-256gb-782114/",
  );

  assert.equal(analysis.detectedStoreSlug, "fravega");
  assert.equal(analysis.detectedStoreName, "Fravega");
  assert.equal(analysis.suggestedCategorySlug, "celulares");
});

test("crea analisis minimo para links invalidos", () => {
  const analysis = analyzeProductImportUrl("esto no es una url");

  assert.equal(analysis.originalUrl, "esto no es una url");
  assert.equal(analysis.normalizedUrl, null);
  assert.equal(analysis.detectedStoreSlug, null);
  assert.equal(analysis.suggestedTitle, null);
  assert.equal(analysis.fieldSources.originalUrl, "manual");
});

test("sugiere categorias por palabras clave", () => {
  assert.equal(suggestCategorySlug("Smart TV Samsung QLED 55 pulgadas"), "televisores");
  assert.equal(suggestCategorySlug("Taladro percutor Bosch 13mm"), "herramientas");
  assert.equal(suggestCategorySlug("Producto sin pista clara"), null);
});
