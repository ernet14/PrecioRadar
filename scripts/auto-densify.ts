// Pipeline automatizado de densificación (Etapa 19 — Fase 1).
//
// Automatiza el ciclo manual:
//   1) descubrir modelos VTEX con solape entre tiendas,
//   2) persistir solo grupos con clave canónica segura,
//   3) medir comparabilidad,
//   4) auditar dispersión/precios basura.
//
// Uso:
//   node --import tsx --env-file=.env scripts/auto-densify.ts
//   node --import tsx --env-file=.env scripts/auto-densify.ts --apply
//   node --import tsx --env-file=.env scripts/auto-densify.ts --apply --include-suspects
//   node --import tsx --env-file=.env scripts/auto-densify.ts --audit-only
//   node --import tsx --env-file=.env scripts/auto-densify.ts --suspects-only
//
// Dry-run por defecto: no escribe en DB.
import { vtexProviders } from "../src/providers/stores/vtexStores";
import type { ProviderProduct } from "../src/providers/stores/types";
import { getPrismaClient } from "../src/lib/prisma";
import { getCanonicalProductKey, normalizeProductName } from "../src/lib/utils";
import { normalizeCategorySlug } from "../src/data/categories";
import { persistProductOfferView } from "../src/services/priceSnapshotService";

const APPLY = process.argv.includes("--apply");
const AUDIT_ONLY = process.argv.includes("--audit-only");
const INCLUDE_SUSPECTS = process.argv.includes("--include-suspects");
const SUSPECTS_ONLY = process.argv.includes("--suspects-only");
const MIN_STORES = readNumberArg("--min-stores", 2);
const MAX_GROUPS = readNumberArg("--max-groups", 40);
const SUSPECT_RATIO = readNumberArg("--suspect-ratio", 1.8);
const JUNK_FLOOR = readNumberArg("--junk-floor", 10_000);
const SEARCH_QUERIES = [
  "Samsung Smart TV",
  "LG Smart TV",
  "TCL Smart TV",
  "Philips Smart TV",
  "Noblex Smart TV",
  "Heladera No Frost",
  "Heladera Samsung",
  "Heladera Whirlpool",
  "Heladera Patrick",
  "Lavarropas Samsung",
  "Lavarropas Drean",
  "Lavarropas Whirlpool",
  "Microondas BGH",
  "Microondas Samsung",
  "Aire acondicionado split",
  "Aire acondicionado inverter",
];
const TARGET_CATEGORIES = new Set(["televisores", "electrodomesticos"]);
const REJECT_TOKENS = new Set([
  "adaptador",
  "base",
  "bolsa",
  "cable",
  "cargador",
  "control",
  "filtro",
  "funda",
  "kit",
  "limpiador",
  "repuesto",
  "soporte",
  "tapa",
]);
const EXPENSIVE_PRODUCT_RE =
  /aire acond|anafe|cocina|freezer|heladera|horno|lavarropas|lavasecarropas|microondas|secarropas|smart\s?tv|televisor|\btv\b/i;

type CandidateGroup = {
  categorySlug: string | null;
  key: string;
  maxPrice: number;
  minPrice: number;
  offers: ProviderProduct[];
  priceRatio: number;
  stores: string[];
};

type ComparableRow = {
  price: number;
  slug: string;
  store: string;
  title: string;
};

type JunkRow = {
  id: string;
  price: number;
  slug: string;
  store: string;
  title: string;
};

type ScorecardRow = {
  comparable_products: bigint;
  products_with_offers: bigint;
};

function readNumberArg(name: string, fallback: number) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  const value = inline?.split("=")[1] ?? process.argv[process.argv.indexOf(name) + 1];
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getCategorySlug(product: ProviderProduct) {
  return normalizeCategorySlug({ name: product.name, slug: product.categorySlug });
}

function hasRejectedToken(product: ProviderProduct) {
  const tokens = normalizeProductName(`${product.name} ${product.title}`).split(" ");
  return tokens.some((token) => REJECT_TOKENS.has(token));
}

function isCandidateOffer(product: ProviderProduct) {
  const categorySlug = getCategorySlug(product);
  if (!categorySlug || !TARGET_CATEGORIES.has(categorySlug)) return false;
  if (!product.available || product.price <= 0) return false;
  if (hasRejectedToken(product)) return false;
  if (product.price < JUNK_FLOOR && EXPENSIVE_PRODUCT_RE.test(product.title)) return false;
  return true;
}

function groupCandidates(products: ProviderProduct[]) {
  const byKey = new Map<string, ProviderProduct[]>();

  for (const product of products) {
    if (!isCandidateOffer(product)) continue;
    const key = getCanonicalProductKey({
      brand: product.brand,
      ean: product.ean,
      name: product.name,
    });
    if (!key) continue;
    const current = byKey.get(key) ?? [];
    current.push(product);
    byKey.set(key, current);
  }

  return Array.from(byKey.entries())
    .map(([key, offers]): CandidateGroup => {
      const storeMap = new Map<string, ProviderProduct>();
      for (const offer of offers.sort((left, right) => left.price - right.price)) {
        if (!storeMap.has(offer.storeSlug)) storeMap.set(offer.storeSlug, offer);
      }
      const uniqueOffers = Array.from(storeMap.values());
      const prices = uniqueOffers.map((offer) => offer.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      return {
        categorySlug: getCategorySlug(uniqueOffers[0]),
        key,
        maxPrice,
        minPrice,
        offers: uniqueOffers,
        priceRatio: minPrice > 0 ? maxPrice / minPrice : Infinity,
        stores: uniqueOffers.map((offer) => offer.storeName).sort(),
      };
    })
    .filter((group) => group.offers.length >= MIN_STORES)
    .sort((left, right) => {
      const storeDelta = right.offers.length - left.offers.length;
      if (storeDelta !== 0) return storeDelta;
      return left.priceRatio - right.priceRatio;
    })
    .slice(0, MAX_GROUPS);
}

async function discoverCandidates() {
  const providers = vtexProviders.filter((provider) => !provider.blocked);
  const allProducts: ProviderProduct[] = [];

  console.log(`Tiendas activas: ${providers.map((provider) => provider.name).join(", ")}`);
  console.log(`Queries: ${SEARCH_QUERIES.length}; min-stores=${MIN_STORES}; max-groups=${MAX_GROUPS}`);

  for (const query of SEARCH_QUERIES) {
    const results = await Promise.all(providers.map((provider) => provider.searchProducts(query)));
    const products = results.flat();
    allProducts.push(...products);
    console.log(`- ${query}: ${products.length} resultados`);
  }

  return groupCandidates(allProducts);
}

async function getExistingComparableSlugs() {
  const prisma = getPrismaClient();
  if (!prisma) return new Set<string>();

  const rows = await prisma.$queryRaw<{ slug: string }[]>`
    SELECT p.slug
    FROM "Product" p
    JOIN "ProductOffer" o ON o."productId" = p.id
    JOIN "Store" s ON s.id = o."storeId"
    WHERE o."isDemo" = false
      AND o.available = true
      AND p."deletedAt" IS NULL
      AND p."isDemo" = false
      AND s."deletedAt" IS NULL
      AND s."isDemo" = false
      AND s.active = true
    GROUP BY p.slug
    HAVING COUNT(DISTINCT o."storeId") >= 2`;

  return new Set(rows.map((row) => row.slug));
}

function printCandidates(groups: CandidateGroup[], existingComparableSlugs: Set<string>) {
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
  if (SUSPECTS_ONLY) {
    console.log(`Mostrando solo sospechosos nuevos por dispersión >= x${SUSPECT_RATIO}.`);
  }

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

async function persistGroups(groups: CandidateGroup[], existingComparableSlugs: Set<string>) {
  if (SUSPECTS_ONLY) {
    console.log("\n(suspects-only: reporte read-only, no se persiste nada.)");
    return;
  }

  const newGroups = groups.filter((group) => !existingComparableSlugs.has(group.key));
  const eligibleGroups = INCLUDE_SUSPECTS
    ? newGroups
    : newGroups.filter((group) => group.priceRatio < SUSPECT_RATIO);
  const offers = newGroups.flatMap((group) => group.offers);
  const eligibleOffers = eligibleGroups.flatMap((group) => group.offers);

  if (!APPLY) {
    console.log(
      `\n(dry-run: persistiría ${eligibleOffers.length}/${offers.length} ofertas de ${eligibleGroups.length}/${newGroups.length} grupos nuevos.)`,
    );
    return;
  }

  console.log(`\nPersistiendo ${eligibleOffers.length} ofertas de ${eligibleGroups.length} grupos nuevos...`);
  if (!INCLUDE_SUSPECTS) {
    console.log(`Grupos con dispersión >= x${SUSPECT_RATIO} quedan bloqueados.`);
  }
  for (const offer of eligibleOffers) {
    await persistProductOfferView(offer);
  }
  console.log("Persistencia completada.");
}

async function measureComparability() {
  const prisma = getPrismaClient();
  if (!prisma) {
    console.log("\nSin DB para medir comparabilidad.");
    return;
  }

  const [row] = await prisma.$queryRaw<ScorecardRow[]>`
    WITH live_products AS (
      SELECT p.id, COUNT(DISTINCT o."storeId") AS stores
      FROM "Product" p
      JOIN "ProductOffer" o ON o."productId" = p.id
      JOIN "Store" s ON s.id = o."storeId"
      WHERE o."isDemo" = false
        AND o.available = true
        AND p."deletedAt" IS NULL
        AND p."isDemo" = false
        AND s."deletedAt" IS NULL
        AND s."isDemo" = false
        AND s.active = true
      GROUP BY p.id
    )
    SELECT COUNT(*) FILTER (WHERE stores >= 2) AS comparable_products,
           COUNT(*) AS products_with_offers
    FROM live_products`;

  const comparable = Number(row?.comparable_products ?? 0);
  const total = Number(row?.products_with_offers ?? 0);
  const rate = total > 0 ? Math.round((comparable / total) * 100) : 0;

  console.log(`\n=== MEDICIÓN DB ===`);
  console.log(`Productos comparables (2+ tiendas): ${comparable}`);
  console.log(`Productos con ofertas vivas:        ${total}`);
  console.log(`comparableRate:                     ${rate}%`);
}

async function auditComparableGroups() {
  const prisma = getPrismaClient();
  if (!prisma) {
    console.log("\nSin DB para auditar comparables.");
    return;
  }

  const rows = await prisma.$queryRaw<ComparableRow[]>`
    SELECT p.slug, s.name AS store, o.price::float8 AS price, o.title
    FROM "ProductOffer" o
    JOIN "Product" p ON p.id = o."productId"
    JOIN "Store" s ON s.id = o."storeId"
    WHERE o."isDemo" = false
      AND o.available = true
      AND p."deletedAt" IS NULL
      AND p."isDemo" = false
      AND s."deletedAt" IS NULL
      AND s."isDemo" = false
      AND s.active = true
      AND p.id IN (
        SELECT o2."productId"
        FROM "ProductOffer" o2
        JOIN "Store" s2 ON s2.id = o2."storeId"
        WHERE o2."isDemo" = false
          AND o2.available = true
          AND s2."deletedAt" IS NULL
          AND s2."isDemo" = false
          AND s2.active = true
        GROUP BY o2."productId"
        HAVING COUNT(DISTINCT o2."storeId") >= 2
      )
    ORDER BY p.slug, o.price`;

  const groups = new Map<string, ComparableRow[]>();
  for (const row of rows) {
    const current = groups.get(row.slug) ?? [];
    current.push(row);
    groups.set(row.slug, current);
  }

  const suspects: Array<{ offers: ComparableRow[]; ratio: number; slug: string }> = [];
  for (const [slug, offers] of groups) {
    const prices = offers.map((offer) => offer.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const ratio = min > 0 ? max / min : Infinity;
    if (ratio >= SUSPECT_RATIO) suspects.push({ offers, ratio, slug });
  }

  console.log(`\n=== AUDITORÍA DB ===`);
  console.log(`Grupos comparables: ${groups.size}`);
  console.log(`Sospechosos por dispersión >= x${SUSPECT_RATIO}: ${suspects.length}`);
  for (const suspect of suspects.slice(0, 20)) {
    console.log(`- ${suspect.slug} x${suspect.ratio.toFixed(2)}`);
    if (SUSPECTS_ONLY) {
      for (const offer of suspect.offers) {
        console.log(
          `   ${offer.store.padEnd(10)} $${offer.price.toLocaleString("es-AR").padStart(12)}  ${offer.title.slice(0, 74)}`,
        );
      }
    }
  }
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
  if (broken.length > 0) {
    console.log(`Para limpiar: node --import tsx --env-file=.env scripts/fix-junk-prices.ts --apply`);
  }
}

async function main() {
  console.log(`Modo: ${SUSPECTS_ONLY ? "SUSPECTS-ONLY" : APPLY ? "APPLY" : AUDIT_ONLY ? "AUDIT-ONLY" : "DRY-RUN"}\n`);

  if (!AUDIT_ONLY) {
    const groups = await discoverCandidates();
    const existingComparableSlugs = await getExistingComparableSlugs();
    printCandidates(groups, existingComparableSlugs);
    await persistGroups(groups, existingComparableSlugs);
  }

  await measureComparability();
  await auditComparableGroups();
  await reportJunkPrices();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
