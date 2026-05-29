// Pipeline automatizado de densificación (Etapa 19 — Fase 1+).
//
// Descubre modelos VTEX con solape entre tiendas, persiste solo grupos con clave
// canónica segura, mide comparabilidad y audita dispersión/precios basura.
//
// El núcleo (descubrir/agrupar/persistir) vive en src/services/densifyService.ts
// y las queries en src/data/densifyQueries.ts (misma fuente que el cron). Este
// script agrega CLI/flags + reportes de auditoría read-only.
//
// Uso:
//   node --import tsx --env-file=.env scripts/auto-densify.ts
//   node --import tsx --env-file=.env scripts/auto-densify.ts --apply
//   node --import tsx --env-file=.env scripts/auto-densify.ts --apply --include-suspects
//   node --import tsx --env-file=.env scripts/auto-densify.ts --audit-only
//   node --import tsx --env-file=.env scripts/auto-densify.ts --suspects-only
//   node --import tsx --env-file=.env scripts/auto-densify.ts --category=deportes
//
// Dry-run por defecto: no escribe en DB.
import { getPrismaClient } from "../src/lib/prisma";
import { persistProductOfferView } from "../src/services/priceSnapshotService";
import {
  discoverDensifyCandidates,
  getExistingComparableSlugs,
  measureComparability,
  type DensifyCandidateGroup,
} from "../src/services/densifyService";
import {
  ALL_DENSIFY_QUERIES,
  DENSIFY_GROUPS,
  DENSIFY_TARGET_CATEGORIES,
} from "../src/data/densifyQueries";

const APPLY = process.argv.includes("--apply");
const AUDIT_ONLY = process.argv.includes("--audit-only");
const INCLUDE_SUSPECTS = process.argv.includes("--include-suspects");
const SUSPECTS_ONLY = process.argv.includes("--suspects-only");
const MIN_STORES = readNumberArg("--min-stores", 2);
const MAX_GROUPS = readNumberArg("--max-groups", 60);
const SUSPECT_RATIO = readNumberArg("--suspect-ratio", 1.8);
const JUNK_FLOOR = readNumberArg("--junk-floor", 10_000);
const CATEGORY = readStringArg("--category");

// Si se pasa --category=slug, solo se densifica esa categoría.
const QUERIES = CATEGORY
  ? DENSIFY_GROUPS.filter((group) => group.categorySlug === CATEGORY).flatMap((g) => g.queries)
  : ALL_DENSIFY_QUERIES;
const TARGET_CATEGORIES = CATEGORY ? new Set([CATEGORY]) : DENSIFY_TARGET_CATEGORIES;

type ComparableRow = { price: number; slug: string; store: string; title: string };
type JunkRow = { id: string; price: number; slug: string; store: string; title: string };

function readNumberArg(name: string, fallback: number) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  const value = inline?.split("=")[1] ?? process.argv[process.argv.indexOf(name) + 1];
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readStringArg(name: string): string | null {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return inline?.split("=")[1] ?? null;
}

const EXPENSIVE_PRODUCT_RE =
  /aire acond|anafe|cocina|freezer|heladera|horno|lavarropas|lavasecarropas|microondas|secarropas|smart\s?tv|televisor|\btv\b|notebook|placa de video|colchon|sommier|bicicleta/i;

function printCandidates(groups: DensifyCandidateGroup[], existingComparableSlugs: Set<string>) {
  const newGroups = groups.filter((group) => !existingComparableSlugs.has(group.key));
  const safeGroups = newGroups.filter((group) => group.priceRatio < SUSPECT_RATIO);
  const suspectGroups = newGroups.filter((group) => group.priceRatio >= SUSPECT_RATIO);
  const existingGroups = groups.length - newGroups.length;
  const visibleGroups = SUSPECTS_ONLY ? suspectGroups : newGroups;

  console.log(`\n=== CANDIDATOS ===`);
  console.log(`Grupos descubiertos: ${groups.length}`);
  console.log(`Nuevos vs DB comparable actual: ${newGroups.length}`);
  console.log(`Nuevos seguros para apply: ${safeGroups.length}`);
  console.log(`Nuevos sospechosos bloqueados: ${suspectGroups.length}`);
  console.log(`Ya comparables en DB: ${existingGroups}`);

  for (const group of visibleGroups) {
    const flag = group.priceRatio >= SUSPECT_RATIO ? `  BLOQUEADO revisar x${group.priceRatio.toFixed(2)}` : "";
    console.log(`\n${group.key} [${group.categorySlug ?? "sin-categoria"}] ${group.stores.length} tiendas${flag}`);
    for (const offer of group.offers) {
      console.log(
        `   ${offer.storeName.padEnd(10)} $${offer.price.toLocaleString("es-AR").padStart(12)}  ${offer.title.slice(0, 74)}`,
      );
    }
  }
}

async function persistGroups(groups: DensifyCandidateGroup[], existingComparableSlugs: Set<string>) {
  if (SUSPECTS_ONLY) {
    console.log("\n(suspects-only: reporte read-only, no se persiste nada.)");
    return;
  }

  const newGroups = groups.filter((group) => !existingComparableSlugs.has(group.key));
  const eligibleGroups = INCLUDE_SUSPECTS
    ? newGroups
    : newGroups.filter((group) => group.priceRatio < SUSPECT_RATIO);
  const eligibleOffers = eligibleGroups.flatMap((group) => group.offers);

  if (!APPLY) {
    console.log(`\n(dry-run: persistiría ${eligibleOffers.length} ofertas de ${eligibleGroups.length} grupos nuevos.)`);
    return;
  }

  console.log(`\nPersistiendo ${eligibleOffers.length} ofertas de ${eligibleGroups.length} grupos nuevos...`);
  for (const offer of eligibleOffers) {
    await persistProductOfferView(offer);
  }
  console.log("Persistencia completada.");
}

async function reportComparability() {
  const { comparable, total } = await measureComparability();
  const rate = total > 0 ? Math.round((comparable / total) * 100) : 0;
  console.log(`\n=== MEDICIÓN DB ===`);
  console.log(`Productos comparables (2+ tiendas): ${comparable}`);
  console.log(`Productos con ofertas vivas:        ${total}`);
  console.log(`comparableRate:                     ${rate}%`);
}

async function reportJunkPrices() {
  const prisma = getPrismaClient();
  if (!prisma) {
    console.log("\nSin DB para revisar precios basura.");
    return;
  }

  const rows = await prisma.$queryRaw<JunkRow[]>`
    SELECT o.id, p.slug, s.name AS store, o.price::float8 AS price, o.title
    FROM "ProductOffer" o
    JOIN "Product" p ON p.id = o."productId"
    JOIN "Store" s ON s.id = o."storeId"
    WHERE o."isDemo" = false
      AND o.available = true
      AND p."deletedAt" IS NULL
      AND p."isDemo" = false
      AND o.price < ${JUNK_FLOOR}
    ORDER BY o.price`;
  const broken = rows.filter((row) => EXPENSIVE_PRODUCT_RE.test(row.title));

  console.log(`\n=== PRECIOS BASURA DB ===`);
  console.log(`Ofertas < $${JUNK_FLOOR.toLocaleString("es-AR")}: ${rows.length}`);
  console.log(`Rotas por categoría cara: ${broken.length}`);
  for (const row of broken.slice(0, 20)) {
    console.log(`- $${row.price.toLocaleString("es-AR")} ${row.store} ${row.title.slice(0, 74)}`);
  }
}

async function main() {
  console.log(`Modo: ${SUSPECTS_ONLY ? "SUSPECTS-ONLY" : APPLY ? "APPLY" : AUDIT_ONLY ? "AUDIT-ONLY" : "DRY-RUN"}`);
  console.log(`Categoría: ${CATEGORY ?? "todas"}; queries=${QUERIES.length}; min-stores=${MIN_STORES}; max-groups=${MAX_GROUPS}\n`);

  if (!AUDIT_ONLY) {
    const groups = await discoverDensifyCandidates({
      queries: QUERIES,
      targetCategories: TARGET_CATEGORIES,
      minStores: MIN_STORES,
      maxGroups: MAX_GROUPS,
      junkFloor: JUNK_FLOOR,
    });
    const existingComparableSlugs = await getExistingComparableSlugs();
    printCandidates(groups, existingComparableSlugs);
    await persistGroups(groups, existingComparableSlugs);
  }

  await reportComparability();
  await reportJunkPrices();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
