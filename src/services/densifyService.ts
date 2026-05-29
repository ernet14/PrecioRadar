import { vtexProviders } from "@/providers/stores/vtexStores";
import type { ProviderProduct } from "@/providers/stores/types";
import { getPrismaClient } from "@/lib/prisma";
import { getCanonicalProductKey, normalizeProductName } from "@/lib/utils";
import { normalizeCategorySlug, isFoodProduct } from "@/data/categories";
import { persistProductOfferView } from "@/services/priceSnapshotService";

// Núcleo de densificación reutilizable: descubre productos VTEX con solape entre
// tiendas y persiste solo grupos comparables (2+ tiendas) con clave canónica
// segura. Lo consumen tanto el script CLI (scripts/auto-densify.ts) como el cron
// /api/internal/densify. SIN alimentos (guarda isFoodProduct).

const DEFAULT_MIN_STORES = 2;
const DEFAULT_MAX_GROUPS = 60;
const DEFAULT_SUSPECT_RATIO = 1.8;
const DEFAULT_JUNK_FLOOR = 10_000;

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

// Productos caros: un precio absurdamente bajo es ruido (mal parseo / accesorio).
const EXPENSIVE_PRODUCT_RE =
  /aire acond|anafe|cocina|freezer|heladera|horno|lavarropas|lavasecarropas|microondas|secarropas|smart\s?tv|televisor|\btv\b|notebook|placa de video|colchon|sommier|bicicleta/i;

export type DensifyOptions = {
  queries: string[];
  targetCategories: Set<string>;
  apply?: boolean;
  includeSuspects?: boolean;
  minStores?: number;
  maxGroups?: number;
  suspectRatio?: number;
  junkFloor?: number;
};

export type DensifyCandidateGroup = {
  categorySlug: string | null;
  key: string;
  maxPrice: number;
  minPrice: number;
  offers: ProviderProduct[];
  priceRatio: number;
  stores: string[];
};

export type DensifyResult = {
  status: "ok" | "database_unavailable" | "error";
  storesQueried: number;
  queries: number;
  discovered: number;
  newGroups: number;
  safeGroups: number;
  suspectGroups: number;
  persistedGroups: number;
  persistedOffers: number;
  comparable: number;
  totalWithOffers: number;
  comparableRate: number;
  reason?: string;
};

function getCategorySlug(product: ProviderProduct) {
  return normalizeCategorySlug({ name: product.name, slug: product.categorySlug });
}

function hasRejectedToken(product: ProviderProduct) {
  const tokens = normalizeProductName(`${product.name} ${product.title}`).split(" ");
  return tokens.some((token) => REJECT_TOKENS.has(token));
}

// Piso de cordura global: nada real en nuestras verticales (sin alimentos) cuesta
// menos de $1000 ARS en 2026. Filtra precios rotos/placeholder de los súper.
const MIN_REASONABLE_PRICE = 1000;

function isCandidateOffer(product: ProviderProduct, targetCategories: Set<string>, junkFloor: number) {
  if (isFoodProduct(product.name)) return false;
  const categorySlug = getCategorySlug(product);
  if (!categorySlug || !targetCategories.has(categorySlug)) return false;
  if (!product.available || product.price < MIN_REASONABLE_PRICE) return false;
  if (hasRejectedToken(product)) return false;
  if (product.price < junkFloor && EXPENSIVE_PRODUCT_RE.test(product.title)) return false;
  return true;
}

function groupCandidates(
  products: ProviderProduct[],
  opts: { targetCategories: Set<string>; minStores: number; maxGroups: number; junkFloor: number },
): DensifyCandidateGroup[] {
  const byKey = new Map<string, ProviderProduct[]>();

  for (const product of products) {
    if (!isCandidateOffer(product, opts.targetCategories, opts.junkFloor)) continue;
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
    .map(([key, offers]): DensifyCandidateGroup => {
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
    .filter((group) => group.offers.length >= opts.minStores)
    .sort((left, right) => {
      const storeDelta = right.offers.length - left.offers.length;
      if (storeDelta !== 0) return storeDelta;
      return left.priceRatio - right.priceRatio;
    })
    .slice(0, opts.maxGroups);
}

export async function getExistingComparableSlugs(): Promise<Set<string>> {
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

export async function measureComparability(): Promise<{ comparable: number; total: number }> {
  const prisma = getPrismaClient();
  if (!prisma) return { comparable: 0, total: 0 };

  const [row] = await prisma.$queryRaw<{ comparable_products: bigint; products_with_offers: bigint }[]>`
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

  return {
    comparable: Number(row?.comparable_products ?? 0),
    total: Number(row?.products_with_offers ?? 0),
  };
}

// Descubre candidatos para un set de queries (sin tocar DB).
export async function discoverDensifyCandidates(opts: DensifyOptions): Promise<DensifyCandidateGroup[]> {
  const providers = vtexProviders.filter((provider) => !provider.blocked);
  const allProducts: ProviderProduct[] = [];

  for (const query of opts.queries) {
    const results = await Promise.all(providers.map((provider) => provider.searchProducts(query)));
    allProducts.push(...results.flat());
  }

  return groupCandidates(allProducts, {
    targetCategories: opts.targetCategories,
    minStores: opts.minStores ?? DEFAULT_MIN_STORES,
    maxGroups: opts.maxGroups ?? DEFAULT_MAX_GROUPS,
    junkFloor: opts.junkFloor ?? DEFAULT_JUNK_FLOOR,
  });
}

export async function runDensifyBatch(opts: DensifyOptions): Promise<DensifyResult> {
  const suspectRatio = opts.suspectRatio ?? DEFAULT_SUSPECT_RATIO;
  const providers = vtexProviders.filter((provider) => !provider.blocked);

  try {
    const groups = await discoverDensifyCandidates(opts);
    const existingComparableSlugs = await getExistingComparableSlugs();

    const newGroups = groups.filter((group) => !existingComparableSlugs.has(group.key));
    const safeGroups = newGroups.filter((group) => group.priceRatio < suspectRatio);
    const suspectGroups = newGroups.filter((group) => group.priceRatio >= suspectRatio);
    const eligibleGroups = opts.includeSuspects ? newGroups : safeGroups;
    const eligibleOffers = eligibleGroups.flatMap((group) => group.offers);

    let persistedOffers = 0;
    if (opts.apply) {
      for (const offer of eligibleOffers) {
        await persistProductOfferView(offer);
        persistedOffers += 1;
      }
    }

    const { comparable, total } = await measureComparability();

    return {
      status: "ok",
      storesQueried: providers.length,
      queries: opts.queries.length,
      discovered: groups.length,
      newGroups: newGroups.length,
      safeGroups: safeGroups.length,
      suspectGroups: suspectGroups.length,
      persistedGroups: opts.apply ? eligibleGroups.length : 0,
      persistedOffers,
      comparable,
      totalWithOffers: total,
      comparableRate: total > 0 ? Math.round((comparable / total) * 100) : 0,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const dbDown = /connect|timeout|database/i.test(msg);
    return {
      status: dbDown ? "database_unavailable" : "error",
      storesQueried: providers.length,
      queries: opts.queries.length,
      discovered: 0,
      newGroups: 0,
      safeGroups: 0,
      suspectGroups: 0,
      persistedGroups: 0,
      persistedOffers: 0,
      comparable: 0,
      totalWithOffers: 0,
      comparableRate: 0,
      reason: msg,
    };
  }
}
