import { getMercadoLibreProductById } from "@/providers/stores/mercadoLibreProvider";
import { persistProductOfferView } from "@/services/priceSnapshotService";
import { getRealPriceHistoryForOffer } from "@/services/productService";
import {
  calculatePriceHistoryStats,
  type PriceHistoryPoint,
  type PriceHistoryStats,
} from "@/services/priceHistoryService";
import { buildVerdictAndStats, type VerdictAndStats } from "@/services/verdictService";

// Vista de un ítem de MercadoLibre por id: lo ingiere (persiste oferta + precio de hoy),
// arma el historial real y calcula veredicto + stats. Reusa todo lo existente; es el
// core que consume la página /ml/[itemId] y, más adelante, la extensión.

export type MercadoLibreItemView = {
  itemId: string;
  title: string;
  imageUrl: string | null;
  productUrl: string;
  currentPrice: number;
  currency: string;
  available: boolean;
  history: PriceHistoryPoint[];
  stats: PriceHistoryStats;
  verdict: VerdictAndStats;
  // true cuando recién empezamos a seguir el ítem (sin historial previo real).
  trackingStartedToday: boolean;
};

export async function getMercadoLibreItemView(
  itemId: string,
): Promise<MercadoLibreItemView | null> {
  const product = await getMercadoLibreProductById(itemId);
  if (!product) return null;

  // Ingesta demand-driven: registra/actualiza la oferta y el punto de precio de hoy.
  // Idempotente y acotado a un punto por día por oferta.
  await persistProductOfferView(product);

  const history = await getRealPriceHistoryForOffer(product.externalId, product.storeSlug);
  const stats = calculatePriceHistoryStats(history, product.price);
  const verdict = buildVerdictAndStats({
    currentPrice: product.price,
    history,
    categorySlug: product.categorySlug,
  });

  return {
    itemId: product.externalId,
    title: product.title,
    imageUrl: product.imageUrl ?? null,
    productUrl: product.productUrl,
    currentPrice: product.price,
    currency: product.currency,
    available: product.available,
    history,
    stats,
    verdict,
    trackingStartedToday: history.length <= 1,
  };
}
