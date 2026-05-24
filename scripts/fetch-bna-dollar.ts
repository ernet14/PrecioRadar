// Exporta la cotización dólar Banco Nación (venta) a CSV compatible con el radar.
//
// Fuente oficial:
//   https://www.bna.com.ar/Cotizador/HistoricoPrincipales?id=billetes
//
// Uso:
//   node --import tsx scripts/fetch-bna-dollar.ts --from 2026-05-20 --to 2026-05-24 --out data/bna-dollar.csv
//   node --import tsx scripts/fetch-bna-dollar.ts --from 2026-05-20 --to 2026-05-24 --no-carry-forward
//
// Si no se pasa --out, imprime el CSV por stdout.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  fetchBnaDollarSeries,
  type BnaDollarRate,
} from "../src/services/bnaDollarService";

function getArg(name: string) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.split("=").slice(1).join("=");
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function csv(rates: BnaDollarRate[]) {
  const lines = ["date,rate,buy,sell,source"];
  for (const rate of rates) {
    lines.push(`${rate.date},${rate.sell},${rate.buy},${rate.sell},${rate.source}`);
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const to = getArg("--to") ?? todayIso();
  const from = getArg("--from") ?? to;
  const out = getArg("--out");
  const carryForward = !process.argv.includes("--no-carry-forward");

  const result = await fetchBnaDollarSeries(from, to, { carryForward });
  if (result.rates.length === 0 && result.missing.length === 0) {
    throw new Error("Rango inválido. Usar --from YYYY-MM-DD --to YYYY-MM-DD.");
  }

  if (result.rates.length === 0) {
    throw new Error("BNA no devolvió cotizaciones para el rango pedido.");
  }

  const output = csv(result.rates);
  if (out) {
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, output, "utf8");
    console.log(`Escrito ${out}: ${result.rates.length} cotizaciones BNA venta${carryForward ? " (con carry-forward)" : ""}.`);
  } else {
    process.stdout.write(output);
  }

  if (result.missing.length > 0) {
    console.error(`Sin dato BNA para ${result.missing.length} fecha(s): ${result.missing.join(", ")}`);
  }
  if (carryForward && result.carried > 0) {
    console.error(`Fechas completadas con última cotización disponible: ${result.carried}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
