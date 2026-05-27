import {
  detectDealQuality,
  type DealQuality,
} from "@/services/fakeDiscountService";
import {
  calculatePriceHistoryStats,
  getMinPrice,
  type PriceHistoryPoint,
} from "@/services/priceHistoryService";

// Entry point único que combina el veredicto de oferta (fakeDiscountService) con las
// estadísticas de ventana (priceHistoryService) en un solo objeto reusable. Lo consume
// hoy el sitio y, en Etapa 19, el endpoint de la extensión. Es PURO: no toca la base;
// el caller le pasa el historial ya cargado (p.ej. getRealPriceHistoryForOffer).

export type VerdictAndStats = {
  verdict: DealQuality;
  stats: {
    /** Precio actual evaluado. */
    current: number;
    /** Promedio de los últimos 60 días (referencia del veredicto), o null. */
    avg60: number | null;
    /** Promedio de todo el historial ("precio típico"), o null. */
    averageAll: number | null;
    /** Precio más bajo en los últimos 30 / 90 días, o null. */
    min30: number | null;
    min90: number | null;
    /** Mínimo y máximo histórico (todo el rango disponible). */
    minAll: number | null;
    maxAll: number | null;
    pointsCount: number;
    isSufficient: boolean;
  };
};

export function buildVerdictAndStats({
  currentPrice,
  history,
  categorySlug,
  now,
}: {
  currentPrice: number;
  history: PriceHistoryPoint[];
  categorySlug?: string | null;
  now?: Date;
}): VerdictAndStats {
  const verdict = detectDealQuality({ currentPrice, history, categorySlug, now });
  const stats = calculatePriceHistoryStats(history, currentPrice);

  return {
    verdict,
    stats: {
      current: currentPrice,
      avg60: verdict.avg60,
      averageAll: history.length > 0 ? stats.averagePrice : null,
      min30: getMinPrice(history, 30),
      min90: getMinPrice(history, 90),
      minAll: history.length > 0 ? stats.minPrice : null,
      maxAll: history.length > 0 ? stats.maxPrice : null,
      pointsCount: stats.pointsCount,
      isSufficient: stats.isSufficient,
    },
  };
}
