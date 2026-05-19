import { mockStoreProducts } from "@/data/mockStoreProducts";
import type { ProviderProduct } from "@/providers/stores";
import { normalizeProductName, slugify } from "@/lib/utils";
import type { CurrencyCode, Recommendation } from "@/types";
import {
  calculatePriceHistoryStats,
  type PriceHistoryPoint,
  type PriceHistoryStats,
} from "@/services/priceHistoryService";
import { getPurchaseRecommendation } from "@/services/recommendationService";
import { getPrismaClient } from "@/lib/prisma";
import { persistProductOfferView } from "@/services/priceSnapshotService";

export type ProductDetail = {
  slug: string;
  name: string;
  normalizedName: string;
  brand?: string | null;
  model?: string | null;
  categorySlug?: string | null;
  imageUrl?: string | null;
  bestOffer: ProviderProduct;
  offers: ProviderProduct[];
  priceHistory: PriceHistoryPoint[];
  priceHistoryStats: PriceHistoryStats;
  recommendation: Recommendation;
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

export function listMockProductsByCategory(categorySlug: string): ProductSummary[] {
  const filtered = mockStoreProducts.filter(
    (product) => product.categorySlug === categorySlug,
  );

  const groups = groupByNormalizedName(filtered);

  return Array.from(groups.values())
    .map(toSummary)
    .sort((left, right) => left.price - right.price);
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
    historyMessage: createHistoryMessage({ stats: priceHistoryStats }),
    similarProducts,
  };
}

async function getRealPriceHistoryForOffer(
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

export async function getProductDetailBySlug(slug: string): Promise<ProductDetail | null> {
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
    historyMessage: createHistoryMessage({ stats: priceHistoryStats }),
  };
}
