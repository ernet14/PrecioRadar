import assert from "node:assert/strict";
import test from "node:test";
import {
  detectInputType,
  isAllowedSearchUrl,
  isMercadoLibreUrl,
} from "../src/lib/utils/input";

test("isMercadoLibreUrl accepts canonical MeLi domains", () => {
  assert.ok(
    isMercadoLibreUrl(
      "https://articulo.mercadolibre.com.ar/MLA-123-galaxy-_JM",
    ),
  );
  assert.ok(isMercadoLibreUrl("https://www.mercadolibre.com.ar/p/MLA1"));
});

test("isMercadoLibreUrl rejects localhost and private IPs", () => {
  assert.equal(isMercadoLibreUrl("http://localhost/foo"), false);
  assert.equal(isMercadoLibreUrl("http://127.0.0.1/foo"), false);
  assert.equal(isMercadoLibreUrl("http://10.0.0.1/foo"), false);
  assert.equal(isMercadoLibreUrl("http://192.168.0.1/foo"), false);
  assert.equal(isMercadoLibreUrl("http://172.16.0.1/foo"), false);
});

test("isMercadoLibreUrl rejects non-http(s) protocols", () => {
  assert.equal(
    isMercadoLibreUrl("ftp://mercadolibre.com.ar/foo"),
    false,
  );
  assert.equal(
    isMercadoLibreUrl("file:///mercadolibre.com.ar"),
    false,
  );
});

test("isMercadoLibreUrl rejects similar-looking non-MeLi domains", () => {
  assert.equal(isMercadoLibreUrl("https://mercadolibre-fake.com"), false);
  assert.equal(isMercadoLibreUrl("https://example.com"), false);
});

test("isAllowedSearchUrl accepts known retail hosts", () => {
  assert.ok(isAllowedSearchUrl("https://www.fravega.com/p/123"));
  assert.ok(isAllowedSearchUrl("https://musimundo.com/p/foo"));
  assert.ok(isAllowedSearchUrl("https://www.cetrogar.com.ar/x"));
});

test("isAllowedSearchUrl rejects arbitrary hosts and private IPs", () => {
  assert.equal(isAllowedSearchUrl("https://example.com/foo"), false);
  assert.equal(isAllowedSearchUrl("http://192.168.0.1/api"), false);
  assert.equal(isAllowedSearchUrl("http://localhost:3000/dev"), false);
});

test("detectInputType returns text for blocked hosts", () => {
  assert.equal(detectInputType("http://localhost/x"), "text");
  assert.equal(detectInputType("http://10.0.0.1/foo"), "text");
});

test("detectInputType returns mercadolibre_url for MeLi domains", () => {
  assert.equal(
    detectInputType("https://articulo.mercadolibre.com.ar/MLA-123"),
    "mercadolibre_url",
  );
});

test("detectInputType returns text for plain text input", () => {
  assert.equal(detectInputType("galaxy a55"), "text");
});
