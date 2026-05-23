// Medición read-only de la North Star de Etapa 19 (comparabilidad).
// Reusa getScorecardHeadline (no recalcula nada), imprime el headline.
//   node --import tsx --env-file=.env scripts/measure-comparables.ts
import { getScorecardHeadline } from "../src/services/monitorService";

async function main() {
  const h = await getScorecardHeadline();
  if (!h) {
    console.log("Sin DB (getPrismaClient devolvió null).");
    return;
  }
  console.log("=== Comparabilidad (scorecard headline) ===");
  console.log(`Productos comparables (2+ tiendas): ${h.comparableProducts}`);
  console.log(`Productos con ofertas vivas:        ${h.productsWithOffers}`);
  console.log(`comparableRate:                     ${h.comparableRate}%`);
  console.log(`Errores de provider (24h):          ${h.providerErrors24h}`);
  console.log(`Updates de precio (última hora):    ${h.priceUpdatesLastHour}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
