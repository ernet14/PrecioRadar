import type { ProviderProduct } from "@/providers/stores";
import type { Recommendation } from "@/types";
import {
  calculatePriceHistoryStats,
  type PriceHistoryPoint,
} from "@/services/priceHistoryService";
import { detectDealQuality } from "@/services/fakeDiscountService";

function countRecentDrops(history: PriceHistoryPoint[]) {
  const recentHistory = [...history]
    .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
    .slice(-6);

  return recentHistory.reduce((drops, point, index) => {
    if (index === 0) {
      return drops;
    }

    return point.price < recentHistory[index - 1].price ? drops + 1 : drops;
  }, 0);
}

function getRecentVariation(history: PriceHistoryPoint[]) {
  const recentHistory = [...history]
    .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
    .slice(-6);

  if (recentHistory.length < 2 || recentHistory[0].price <= 0) {
    return 0;
  }

  return (
    (recentHistory[recentHistory.length - 1].price - recentHistory[0].price) /
    recentHistory[0].price
  );
}

export function getPurchaseRecommendation({
  currentPrice,
  history,
  product,
}: {
  product: ProviderProduct;
  history: PriceHistoryPoint[];
  currentPrice: number;
}): Recommendation {
  const stats = calculatePriceHistoryStats(history, currentPrice);

  if (!product.available) {
    return {
      level: "WAIT",
      label: "Conviene esperar",
      reason: "La mejor oferta no figura disponible en este momento.",
      score: 20,
      currentPrice,
      minPrice: stats.minPrice,
      maxPrice: stats.maxPrice,
      averagePrice: stats.averagePrice,
    };
  }

  if (!stats.isSufficient) {
    return {
      level: "INSUFFICIENT_DATA",
      label: "Sin historial verificado",
      reason:
        "Estamos recolectando datos. Necesitamos más capturas para mostrar una recomendación confiable.",
      score: 0,
      currentPrice,
      minPrice: stats.minPrice,
      maxPrice: stats.maxPrice,
      averagePrice: stats.averagePrice,
    };
  }

  const minDistance = (currentPrice - stats.minPrice) / stats.minPrice;
  const maxDistance = (stats.maxPrice - currentPrice) / stats.maxPrice;
  const averageDistance = (currentPrice - stats.averagePrice) / stats.averagePrice;
  const recentDrops = countRecentDrops(history);
  const recentVariation = getRecentVariation(history);

  if (minDistance <= 0.03) {
    return {
      level: "EXCELLENT_PRICE",
      label: "Excelente precio",
      reason: "Esta cerca del minimo registrado.",
      score: 92,
      currentPrice,
      minPrice: stats.minPrice,
      maxPrice: stats.maxPrice,
      averagePrice: stats.averagePrice,
    };
  }

  const dealQuality = detectDealQuality({
    currentPrice,
    history,
    categorySlug: product.categorySlug,
  });
  if (dealQuality.verdict === "INFLATED") {
    return {
      level: "INFLATED_OFFER",
      label: "Oferta inflada",
      reason: dealQuality.reason,
      score: 20,
      currentPrice,
      minPrice: stats.minPrice,
      maxPrice: stats.maxPrice,
      averagePrice: dealQuality.avg60 ?? stats.averagePrice,
    };
  }

  if (recentDrops >= 3 && recentVariation <= -0.04 && minDistance > 0.05) {
    return {
      level: "WAIT",
      label: "Conviene esperar",
      reason:
        "El producto tuvo varias bajas recientes; podria convenir esperar.",
      score: 38,
      currentPrice,
      minPrice: stats.minPrice,
      maxPrice: stats.maxPrice,
      averagePrice: stats.averagePrice,
    };
  }

  if (minDistance <= 0.08 || averageDistance <= -0.05) {
    return {
      level: "GOOD_PRICE",
      label: "Buen precio",
      reason: "Esta por debajo del precio promedio reciente.",
      score: 78,
      currentPrice,
      minPrice: stats.minPrice,
      maxPrice: stats.maxPrice,
      averagePrice: stats.averagePrice,
    };
  }

  if (maxDistance <= 0.03 || averageDistance >= 0.1) {
    return {
      level: "EXPENSIVE",
      label: "Caro",
      reason: "Esta cerca del precio mas alto registrado.",
      score: 35,
      currentPrice,
      minPrice: stats.minPrice,
      maxPrice: stats.maxPrice,
      averagePrice: stats.averagePrice,
    };
  }

  return {
    level: "NORMAL_PRICE",
    label: "Precio normal",
    reason: "Esta dentro del precio promedio reciente.",
    score: 62,
    currentPrice,
    minPrice: stats.minPrice,
    maxPrice: stats.maxPrice,
    averagePrice: stats.averagePrice,
  };
}
