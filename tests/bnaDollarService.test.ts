import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBnaHistoricalUrl,
  eachIsoDate,
  parseArsNumber,
  parseBnaDollarHistoricalHtml,
} from "../src/services/bnaDollarService";

test("buildBnaHistoricalUrl uses BNA historical billetes parameters", () => {
  const url = new URL(buildBnaHistoricalUrl("2026-05-24"));

  assert.equal(url.origin, "https://www.bna.com.ar");
  assert.equal(url.pathname, "/Cotizador/HistoricoPrincipales");
  assert.equal(url.searchParams.get("id"), "billetes");
  assert.equal(url.searchParams.get("fecha"), "24/05/2026");
  assert.equal(url.searchParams.get("filtroDolar"), "1");
});

test("parseArsNumber handles Argentine decimal format", () => {
  assert.equal(parseArsNumber("$ 1.234,50"), 1234.5);
  assert.equal(parseArsNumber("1420,00"), 1420);
  assert.equal(parseArsNumber("sin dato"), null);
});

test("parseBnaDollarHistoricalHtml extracts buy and sell from BNA-like table", () => {
  const html = `
    <table>
      <tr><th>Moneda</th><th>Compra</th><th>Venta</th></tr>
      <tr><td>Dolar U.S.A</td><td>1370,00</td><td>1420,00</td></tr>
    </table>
  `;

  assert.deepEqual(parseBnaDollarHistoricalHtml(html, "2026-05-24"), {
    buy: 1370,
    date: "2026-05-24",
    sell: 1420,
    source: "bna",
  });
});

test("eachIsoDate returns inclusive ranges", () => {
  assert.deepEqual(eachIsoDate("2026-05-20", "2026-05-22"), [
    "2026-05-20",
    "2026-05-21",
    "2026-05-22",
  ]);
  assert.deepEqual(eachIsoDate("2026-05-22", "2026-05-20"), []);
});
