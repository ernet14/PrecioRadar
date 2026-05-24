// Corrida operativa interna: índice de precios + dólar BNA + pass-through.
//
// Uso:
//   node --import tsx --env-file=.env scripts/run-data-radar.ts
//   node --import tsx --env-file=.env scripts/run-data-radar.ts --category celulares
//
// No publica nada. Sirve para revisar el radar interno con fuente BNA venta.
import { mvpCategoryDescriptors } from "../src/data/categories";
import { computeBnaDataRadar } from "../src/services/dataRadarService";
import { computePriceIndex, type PriceIndexResult } from "../src/services/priceIndexService";
import type { PassThroughLagResult } from "../src/services/passThroughService";

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

async function measure(label: string, categorySlug: string | null) {
  const index = await computePriceIndex({ categorySlug });
  printIndexHeader(label, index);

  const radar = await computeBnaDataRadar(index);
  if (!radar) {
    console.log("sin radar: índice sin serie suficiente.");
    return;
  }

  console.log(
    `fuente dólar: BNA venta · ${radar.from}..${radar.to} · cotizaciones=${radar.fx.rates.length} · carry-forward=${radar.fx.carried}`,
  );
  if (radar.fx.missing.length > 0) {
    console.log(`sin dato BNA: ${radar.fx.missing.join(", ")}`);
  }
  for (const lag of radar.passThrough.lags) printLag(lag);
}

async function main() {
  const category = getArg("--category");
  if (category) {
    await measure(category, category);
    return;
  }

  await measure("total", null);
  for (const descriptor of mvpCategoryDescriptors) {
    await measure(descriptor.slug, descriptor.slug);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
