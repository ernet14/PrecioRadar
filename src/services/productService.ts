import { mockStoreProducts } from "@/data/mockStoreProducts";
import type { ProviderProduct } from "@/providers/stores";
import { normalizeProductName, slugify } from "@/lib/utils";
import type { Recommendation } from "@/types";
import {
  calculatePriceHistoryStats,
  getMockPriceHistoryForProduct,
  type PriceHistoryPoint,
  type PriceHistoryStats,
} from "@/services/priceHistoryService";
import { getPurchaseRecommendation } from "@/services/recommendationService";

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

function createHistoryMessage({
  offers,
  stats,
}: {
  offers: ProviderProduct[];
  stats: PriceHistoryStats;
}) {
  if (!stats.isSufficient) {
    return "Todavia no hay historial suficiente para calcular una referencia real.";
  }

  if (offers.every((offer) => offer.isDemo)) {
    return "El historial es demo y sirve solo como referencia visual para esta etapa.";
  }

  return "El historial disponible todavia es limitado para este producto.";
}

function toSummary(group: ProviderProduct[]): ProductSummary {
  const sortedOffers = sortOffers(group);
  const bestOffer = sortedOffers[0];
  const priceHistory = getMockPriceHistoryForProduct(bestOffer);
  const recommendation = getPurchaseRecommendation({
    product: bestOffer,
    history: priceHistory,
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
  const priceHistory = getMockPriceHistoryForProduct(bestOffer);
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
    historyMessage: createHistoryMessage({ offers, stats: priceHistoryStats }),
    similarProducts,
  };
}
