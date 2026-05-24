// Radar dólar pass-through v0 (read-only).
//
// Cruza el índice de precios interno con una serie diaria de dólar provista por CSV.
// El CSV debe tener columnas: date,rate (YYYY-MM-DD, cotización).
//
// Uso:
//   node --import tsx --env-file=.env scripts/measure-pass-through.ts --fx-csv data/dolar.csv
//   node --import tsx --env-file=.env scripts/measure-pass-through.ts --fx-csv data/dolar.csv --category celulares
//
// No trae cotizaciones de internet a propósito: la fuente de dólar debe quedar
// explicitada y reproducible para no mezclar datos externos opacos con el índice.
import { readFile } from "node:fs/promises";
import { mvpCategoryDescriptors } from "../src/data/categories";
import { computePriceIndex, type PriceIndexResult } from "../src/services/priceIndexService";
import {
  computePassThrough,
  parseFxCsv,
  type PassThroughLagResult,
} from "../src/services/passThroughService";

function getArg(name: string) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.split("=").slice(1).join("=");
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fmt(value: number | null, suffix = "") {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value}${suffix}`;
}

function printLag(row: PassThroughLagResult) {
  console.log(
    `lag ${String(row.lagDays).padStart(2)}d  ${row.status.padEnd(18)} matched=${String(row.matchedDays).padStart(2)}  precio=${fmt(row.priceChangePct, "%").padEnd(8)} dolar=${fmt(row.fxChangePct, "%").padEnd(8)} beta=${fmt(row.beta).padEnd(8)} corr=${fmt(row.correlation)}`,
  );
}

function printIndexHeader(label: string, index: PriceIndexResult) {
  const latestSample = index.points.at(-1)?.sampleSize ?? 0;
  console.log(`\n=== ${label} ===`);
  console.log(
    `serie precio: ${index.baseDate ?? "—"}..${index.latestDate ?? "—"} · días=${index.days} · productos=${index.productsTracked} · sample latest=${latestSample}`,
  );
  if (index.days < 30) {
    console.log("estado: construyendo serie; usar como radar interno, no como conclusión pública.");
  }
}

async function loadFxSeries() {
  const csvPath = getArg("--fx-csv");
  if (!csvPath) {
    console.log("Falta --fx-csv <archivo.csv> con columnas date,rate.");
    console.log("Ejemplo:");
    console.log("date,rate");
    console.log("2026-05-20,1150");
    console.log("2026-05-21,1162");
    return null;
  }

  const raw = await readFile(csvPath, "utf8");
  const series = parseFxCsv(raw);
  if (series.length === 0) {
    console.log(`No se pudo leer una serie válida desde ${csvPath}.`);
    return null;
  }
  return series;
}

async function measure(label: string, categorySlug: string | null, fxSeries: Awaited<ReturnType<typeof loadFxSeries>>) {
  if (!fxSeries) return;
  const index = await computePriceIndex({ categorySlug });
  printIndexHeader(label, index);
  const result = computePassThrough(index, fxSeries);
  for (const lag of result.lags) printLag(lag);
}

async function main() {
  const fxSeries = await loadFxSeries();
  if (!fxSeries) return;

  const category = getArg("--category");
  if (category) {
    await measure(category, category, fxSeries);
    return;
  }

  await measure("total", null, fxSeries);
  for (const descriptor of mvpCategoryDescriptors) {
    await measure(descriptor.slug, descriptor.slug, fxSeries);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
