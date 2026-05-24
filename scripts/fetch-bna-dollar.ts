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
  eachIsoDate,
  fetchBnaDollarRate,
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

function withDate(rate: BnaDollarRate, date: string): BnaDollarRate {
  return { ...rate, date };
}

async function main() {
  const to = getArg("--to") ?? todayIso();
  const from = getArg("--from") ?? to;
  const out = getArg("--out");
  const carryForward = !process.argv.includes("--no-carry-forward");
  const dates = eachIsoDate(from, to);

  if (dates.length === 0) {
    throw new Error("Rango inválido. Usar --from YYYY-MM-DD --to YYYY-MM-DD.");
  }

  const rates: BnaDollarRate[] = [];
  const missing: string[] = [];
  let carried = 0;
  let lastRate: BnaDollarRate | null = null;

  for (const date of dates) {
    const rate = await fetchBnaDollarRate(date);
    if (rate) {
      rates.push(rate);
      lastRate = rate;
    } else if (carryForward && lastRate) {
      rates.push(withDate(lastRate, date));
      carried++;
    } else {
      missing.push(date);
    }
  }

  if (rates.length === 0) {
    throw new Error("BNA no devolvió cotizaciones para el rango pedido.");
  }

  const output = csv(rates);
  if (out) {
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, output, "utf8");
    console.log(`Escrito ${out}: ${rates.length} cotizaciones BNA venta${carryForward ? " (con carry-forward)" : ""}.`);
  } else {
    process.stdout.write(output);
  }

  if (missing.length > 0) {
    console.error(`Sin dato BNA para ${missing.length} fecha(s): ${missing.join(", ")}`);
  }
  if (carryForward) {
    if (carried > 0) console.error(`Fechas completadas con última cotización disponible: ${carried}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
