import { mockStoreProducts } from "@/data/mockStoreProducts";
import type { ProviderProduct } from "@/providers/stores";
import { normalizeProductName, slugify } from "@/lib/utils";
import type { CurrencyCode, ProductCondition, Recommendation } from "@/types";
import {
  calculatePriceHistoryStats,
  type PriceHistoryPoint,
  type PriceHistoryStats,
} from "@/services/priceHistoryService";
import { getPurchaseRecommendation } from "@/services/recommendationService";
import { detectDealQuality, type DealQuality } from "@/services/fakeDiscountService";
import { getPrismaClient } from "@/lib/prisma";
import { persistProductOfferView } from "@/services/priceSnapshotService";
import { getCategoryQuerySlugs, normalizeCategorySlug } from "@/data/categories";

export type ProductDetail = {
  slug: string;
  name: string;
  normalizedName: string;
  brand?: string | null;
  model?: string | null;
  categorySlug?: string | null;
  imageUrl?: string | null;
  aiDescription?: string | null;
  bestOffer: ProviderProduct;
  offers: ProviderProduct[];
  priceHistory: PriceHistoryPoint[];
  priceHistoryStats: PriceHistoryStats;
  recommendation: Recommendation;
  dealQuality: DealQuality;
  historyMessage: string;
  similarProducts: ProductSummary[];
};

export type ProductSummary = {
  slug: string;
  name: string;
  imageUrl?: string | null;
  price: number;
  storeName: string;
  recommendationLabel: string;
  comparable?: boolean;
  storeCount?: number;
};

function getProductSlug(product: ProviderProduct) {
  return product.slug ?? slugify(product.name);
}

function getLegacyOfferSlug(product: ProviderProduct) {
  return slugify(`${product.storeSlug} ${product.externalId}`);
}

function groupByNormalizedName(products: ProviderProduct[]) {
  const groups = new Map<string, ProviderProduct[]>();

  for (const product of products) {
    const key = normalizeProductName(product.name);
    const currentGroup = groups.get(key) ?? [];
    currentGroup.push(product);
    groups.set(key, currentGroup);
  }

  return groups;
}

function sortOffers(offers: ProviderProduct[]) {
  return [...offers].sort((left, right) => {
    if (left.available !== right.available) {
      return left.available ? -1 : 1;
    }

    return left.price - right.price;
  });
}

function createHistoryMessage({ stats }: { stats: PriceHistoryStats }) {
  if (!stats.isSufficient) {
    return "Recolectando datos. Volvé en unos días para ver la evolución real del precio.";
  }

  return "El historial disponible todavia es limitado para este producto.";
}

function toSummary(group: ProviderProduct[]): ProductSummary {
  const sortedOffers = sortOffers(group);
  const bestOffer = sortedOffers[0];
  const recommendation = getPurchaseRecommendation({
    product: bestOffer,
    history: [],
    currentPrice: bestOffer.price,
  });

  return {
    slug: getProductSlug(bestOffer),
    name: bestOffer.name,
    imageUrl: bestOffer.imageUrl,
    price: bestOffer.price,
    storeName: bestOffer.storeName,
    recommendationLabel: recommendation.label,
  };
}

export function getAllMockProductSlugs() {
  return Array.from(
    new Set(mockStoreProducts.map((product) => getProductSlug(product))),
  );
}

export type IndexableProduct = { slug: string; comparable: boolean; lastModified: Date };

// Slugs de productos REALES (no demo, no borrados) con al menos una oferta viva,
// para el sitemap y generateStaticParams. `comparable` = 2+ tiendas distintas
// (contenido único más fuerte → mayor prioridad de indexación). Devuelve [] si no
// hay DB (p.ej. build sin conexión): el sitemap cae a sus rutas estáticas.
export async function getIndexableProductSlugs(): Promise<IndexableProduct[]> {
  const prisma = getPrismaClient();
  if (!prisma) return [];

  try {
    const rows = await prisma.$queryRaw<{ slug: string; last_modified: Date; stores: bigint }[]>`
      SELECT p.slug, MAX(o."updatedAt") AS last_modified, COUNT(DISTINCT o."storeId") AS stores
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
      ORDER BY stores DESC, last_modified DESC`;
    return rows.map((r) => ({
      slug: r.slug,
      comparable: Number(r.stores) >= 2,
      lastModified: r.last_modified,
    }));
  } catch {
    return [];
  }
}

export function listMockProductsByCategory(categorySlug: string): ProductSummary[] {
  const filtered = mockStoreProducts.filter(
    (product) => product.categorySlug === categorySlug,
  );

  const groups = groupByNormalizedName(filtered);

  return Array.from(groups.values())
    .map(toSummary)
    .sort((left, right) => left.price - right.price);
}

export type CategoryProduct = ProductSummary & {
  storeCount: number;
  comparable: boolean;
};

// Productos REALES indexables de una categoría (mismos filtros que el sitemap:
// no demo, no borrados, oferta viva, tienda activa). `comparable` = 2+ tiendas.
// Devuelve [] si no hay DB (build sin conexión) → la página cae al catálogo mock.
export async function listRealProductsByCategory(
  categorySlug: string,
): Promise<CategoryProduct[]> {
  const prisma = getPrismaClient();
  if (!prisma) return [];

  const liveOffer = {
    isDemo: false,
    available: true,
    store: { deletedAt: null, isDemo: false, active: true },
  };
  const categorySlugs = getCategoryQuerySlugs(categorySlug);

  try {
    const products = await prisma.product.findMany({
      where: {
        category: { slug: { in: categorySlugs } },
        deletedAt: null,
        isDemo: false,
        offers: { some: liveOffer },
      },
      include: {
        category: true,
        offers: {
          where: liveOffer,
          include: { store: true },
          orderBy: { price: "asc" },
        },
      },
      take: 60,
    });

    return products
      .filter((product) =>
        normalizeCategorySlug({ name: product.name, slug: product.category.slug }) === categorySlug,
      )
      .map((product) => {
        const storeCount = new Set(
          product.offers.map((offer) => offer.storeId),
        ).size;
        const comparable = storeCount >= 2;
        return {
          slug: product.slug,
          name: product.name,
          imageUrl: product.imageUrl,
          price: Number(product.offers[0].price),
          storeName: product.offers[0].store.name,
          recommendationLabel: comparable
            ? `Comparado en ${storeCount} tiendas`
            : "Precio de 1 tienda",
          storeCount,
          comparable,
        };
      })
      .sort((left, right) => {
        if (left.comparable !== right.comparable) {
          return left.comparable ? -1 : 1;
        }
        return left.price - right.price;
      });
  } catch {
    return [];
  }
}

export function getMockProductDetailBySlug(
  slug: string,
): ProductDetail | null {
  const product = mockStoreProducts.find(
    (candidate) =>
      getProductSlug(candidate) === slug ||
      candidate.slugAliases?.includes(slug) ||
      getLegacyOfferSlug(candidate) === slug,
  );

  if (!product) {
    return null;
  }

  const groupedProducts = groupByNormalizedName(mockStoreProducts);
  const offers = sortOffers(groupedProducts.get(product.normalizedName) ?? [product]);
  const bestOffer = offers[0];
  const priceHistory: PriceHistoryPoint[] = [];
  const priceHistoryStats = calculatePriceHistoryStats(
    priceHistory,
    bestOffer.price,
  );
  const recommendation = getPurchaseRecommendation({
    product: bestOffer,
    history: priceHistory,
    currentPrice: bestOffer.price,
  });
  const similarProducts = Array.from(groupedProducts.values())
    .filter(
      (group) =>
        group[0].normalizedName !== product.normalizedName &&
        group[0].categorySlug === product.categorySlug,
    )
    .sort((leftGroup, rightGroup) => {
      const left = leftGroup[0];
      const right = rightGroup[0];
      const leftScore = Number(left.brand === product.brand);
      const rightScore = Number(right.brand === product.brand);

      return rightScore - leftScore;
    })
    .map(toSummary)
    .slice(0, 4);

  return {
    slug: getProductSlug(bestOffer),
    name: bestOffer.name,
    normalizedName: bestOffer.normalizedName,
    brand: bestOffer.brand,
    model: bestOffer.model,
    categorySlug: bestOffer.categorySlug,
    imageUrl: bestOffer.imageUrl,
    bestOffer,
    offers,
    priceHistory,
    priceHistoryStats,
    recommendation,
    dealQuality: detectDealQuality({
      currentPrice: bestOffer.price,
      history: priceHistory,
      categorySlug: bestOffer.categorySlug,
    }),
    historyMessage: createHistoryMessage({ stats: priceHistoryStats }),
    similarProducts,
  };
}

export async function getRealPriceHistoryForOffer(
  externalId: string,
  storeSlug: string,
): Promise<PriceHistoryPoint[]> {
  const prisma = getPrismaClient();

  if (!prisma) return [];

  try {
    const store = await prisma.store.findFirst({
      where: { slug: storeSlug, deletedAt: null },
    });

    if (!store) return [];

    const offer = await prisma.productOffer.findFirst({
      where: {
        storeId: store.id,
        externalId,
        product: { deletedAt: null },
      },
    });

    if (!offer) return [];

    const records = await prisma.priceHistory.findMany({
      where: { offerId: offer.id, isDemo: false },
      orderBy: { recordedAt: "asc" },
      take: 200,
    });

    return records.map((record) => ({
      date: record.recordedAt.toISOString().slice(0, 10),
      recordedAt: record.recordedAt.toISOString(),
      price: Number(record.price),
      currency: record.currency as CurrencyCode,
      source: record.source,
      isDemo: false,
    }));
  } catch {
    return [];
  }
}

type DbOfferInput = {
  externalId: string | null;
  id: string;
  title: string;
  price: unknown;
  currency: string;
  productUrl: string;
  imageUrl: string | null;
  available: boolean;
  condition: ProductCondition;
  lastCheckedAt: Date | null;
};

function dbToProviderProduct(args: {
  product: {
    name: string;
    normalizedName: string;
    brand: string | null;
    model: string | null;
    slug: string;
    imageUrl: string | null;
  };
  categorySlug: string | null;
  offer: DbOfferInput;
  store: { slug: string; name: string };
}): ProviderProduct {
  const { product, categorySlug, offer, store } = args;

  return {
    externalId: offer.externalId ?? offer.id,
    provider: store.slug,
    slug: product.slug,
    storeSlug: store.slug,
    storeName: store.name,
    title: offer.title,
    name: product.name,
    normalizedName: product.normalizedName,
    brand: product.brand,
    model: product.model,
    categorySlug,
    imageUrl: offer.imageUrl ?? product.imageUrl,
    productUrl: offer.productUrl,
    price: Number(offer.price),
    currency: offer.currency as CurrencyCode,
    condition: offer.condition,
    available: offer.available,
    isDemo: false,
    lastCheckedAt: offer.lastCheckedAt ?? new Date(),
  };
}

async function getRealSimilarProducts(
  prisma: NonNullable<ReturnType<typeof getPrismaClient>>,
  product: { id: string },
  categorySlug: string | null,
): Promise<ProductSummary[]> {
  const categorySlugs = categorySlug ? getCategoryQuerySlugs(categorySlug) : [];
  const liveOffer = {
    isDemo: false,
    available: true,
    store: { deletedAt: null, isDemo: false, active: true },
  };
  const others = await prisma.product.findMany({
    where: {
      ...(categorySlugs.length > 0
        ? { category: { slug: { in: categorySlugs } } }
        : {}),
      deletedAt: null,
      isDemo: false,
      id: { not: product.id },
      offers: { some: liveOffer },
    },
    include: {
      category: true,
      offers: {
        where: liveOffer,
        orderBy: { price: "asc" },
        include: { store: true },
      },
    },
    take: 40,
  });

  return others
    .filter((candidate) =>
      categorySlug
        ? normalizeCategorySlug({ name: candidate.name, slug: candidate.category.slug }) === categorySlug
        : true,
    )
    .map((candidate) => {
      const storeCount = new Set(candidate.offers.map((offer) => offer.storeId)).size;
      const comparable = storeCount >= 2;
      return {
        slug: candidate.slug,
        name: candidate.name,
        imageUrl: candidate.imageUrl,
        price: Number(candidate.offers[0].price),
        storeName: candidate.offers[0].store.name,
        recommendationLabel: comparable
          ? `Comparado en ${storeCount} tiendas`
          : "Precio de 1 tienda",
        comparable,
        storeCount,
      };
    })
    .sort((left, right) => {
      if (left.comparable !== right.comparable) return left.comparable ? -1 : 1;
      return left.price - right.price;
    })
    .slice(0, 4);
}

async function getRealProductDetailBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  const prisma = getPrismaClient();

  if (!prisma) return null;

  try {
    const product = await prisma.product.findFirst({
      where: { slug, deletedAt: null, isDemo: false },
      include: {
        category: true,
        offers: { where: { isDemo: false }, include: { store: true } },
      },
    });

    if (!product) return null;

    const liveOffers = product.offers.filter((offer) => !offer.store.deletedAt);

    if (liveOffers.length === 0) return null;

    const categorySlug = normalizeCategorySlug({
      name: product.name,
      slug: product.category?.slug ?? null,
    });
    const offers = sortOffers(
      liveOffers.map((offer) =>
        dbToProviderProduct({ product, categorySlug, offer, store: offer.store }),
      ),
    );
    const bestOffer = offers[0];
    const priceHistory = await getRealPriceHistoryForOffer(
      bestOffer.externalId,
      bestOffer.storeSlug,
    );
    const priceHistoryStats = calculatePriceHistoryStats(
      priceHistory,
      bestOffer.price,
    );
    const recommendation = getPurchaseRecommendation({
      product: bestOffer,
      history: priceHistory,
      currentPrice: bestOffer.price,
    });
    const similarProducts = await getRealSimilarProducts(prisma, product, categorySlug);

    return {
      slug: product.slug,
      name: product.name,
      normalizedName: product.normalizedName,
      brand: product.brand,
      model: product.model,
      categorySlug,
      imageUrl: product.imageUrl,
      aiDescription: product.aiDescription,
      bestOffer,
      offers,
      priceHistory,
      priceHistoryStats,
      recommendation,
      dealQuality: detectDealQuality({
        currentPrice: bestOffer.price,
        history: priceHistory,
        categorySlug,
      }),
      historyMessage: createHistoryMessage({ stats: priceHistoryStats }),
      similarProducts,
    };
  } catch {
    return null;
  }
}

export async function getProductDetailBySlug(slug: string): Promise<ProductDetail | null> {
  // Productos reales persistidos (búsqueda + cron) tienen prioridad sobre el demo.
  const realDetail = await getRealProductDetailBySlug(slug);

  if (realDetail) return realDetail;

  const mockDetail = getMockProductDetailBySlug(slug);

  if (!mockDetail) return null;

  // Persist fire-and-forget so the cron can refresh prices later
  persistProductOfferView(mockDetail.bestOffer).catch(() => {});

  const realHistory = await getRealPriceHistoryForOffer(
    mockDetail.bestOffer.externalId,
    mockDetail.bestOffer.storeSlug,
  );

  if (realHistory.length === 0) return mockDetail;

  const priceHistoryStats = calculatePriceHistoryStats(realHistory, mockDetail.bestOffer.price);
  const recommendation = getPurchaseRecommendation({
    product: mockDetail.bestOffer,
    history: realHistory,
    currentPrice: mockDetail.bestOffer.price,
  });

  return {
    ...mockDetail,
    priceHistory: realHistory,
    priceHistoryStats,
    recommendation,
    dealQuality: detectDealQuality({
      currentPrice: mockDetail.bestOffer.price,
      history: realHistory,
      categorySlug: mockDetail.bestOffer.categorySlug,
    }),
    historyMessage: createHistoryMessage({ stats: priceHistoryStats }),
  };
}
