// Higiene de dataset (Etapa 19 Fase 1): marca available=false las ofertas de
// tiendas con bloqueo PERMANENTE (provider.blocked, p.ej. Frávega 403) + las
// residuales de MercadoLibre. Esas ofertas quedaron congeladas en available=true
// (el cron las salteaba sin marcarlas) e inflaban el comparableRate del scorecard.
//
//   node --import tsx --env-file=.env scripts/cleanup-blocked-offers.ts          # dry-run
//   node --import tsx --env-file=.env scripts/cleanup-blocked-offers.ts --apply  # escribe
import { getPrismaClient } from "../src/lib/prisma";
import { vtexProviders } from "../src/providers/stores/vtexStores";

const APPLY = process.argv.includes("--apply");

// Bloqueo permanente: VTEX con provider.blocked (name === storeSlug) + ML residual.
const blockedSlugs = [
  ...vtexProviders.filter((p) => p.blocked).map((p) => p.name),
  "mercadolibre",
];

async function main() {
  const prisma = getPrismaClient();
  if (!prisma) {
    console.log("Sin DB.");
    return;
  }
  console.log(`Slugs a limpiar: ${blockedSlugs.join(", ")}`);
  console.log(`Modo: ${APPLY ? "APPLY (escribe)" : "DRY-RUN (no escribe)"}\n`);

  const stores = await prisma.store.findMany({ where: { slug: { in: blockedSlugs } } });
  let total = 0;
  for (const store of stores) {
    const count = await prisma.productOffer.count({
      where: { storeId: store.id, isDemo: false, available: true },
    });
    console.log(`  ${store.slug.padEnd(14)} ${count} ofertas available=true`);
    total += count;
    if (APPLY && count > 0) {
      await prisma.productOffer.updateMany({
        where: { storeId: store.id, isDemo: false, available: true },
        data: { available: false },
      });
    }
  }
  console.log(`\nTotal a marcar no disponibles: ${total}`);
  if (APPLY) console.log("Marcadas available=false.");
  else console.log("(dry-run: nada escrito. Correr con --apply.)");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
