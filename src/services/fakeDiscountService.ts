import {
  calculatePriceHistoryStats,
  getAveragePrice,
  type PriceHistoryPoint,
} from "@/services/priceHistoryService";
import { getRelevantEvent, type CommercialEvent } from "@/data/commercialEvents";

// Detector algorítmico de ofertas falsas (roadmap Etapa 12 / sección 24).
// Compara el precio actual contra el promedio de los últimos 60 días y emite
// uno de cuatro veredictos verificables.

export type DealVerdict = "REAL" | "MINOR" | "INFLATED" | "NO_DATA";

export type PreEventInflation = {
  event: CommercialEvent;
  risePercent: number; // suba en los días previos al evento (0.2 = +20%)
};

export type DealQuality = {
  verdict: DealVerdict;
  label: string;
  emoji: string;
  reason: string;
  /** Promedio de los últimos 60 días, o null si no alcanza. */
  avg60: number | null;
  /** Descuento real vs avg60. Positivo = más barato que el promedio. */
  discountPercent: number | null;
  /** Descuento mínimo (fracción) que la categoría exige para ser "oferta real". */
  threshold: number;
  preEventInflation: PreEventInflation | null;
};

// Descuento mínimo por categoría para considerar una oferta "real".
// Fuente: roadmap Etapa 12, tarea 3 (umbrales por categoría).
const CATEGORY_DISCOUNT_THRESHOLDS: Record<string, number> = {
  celulares: 0.1,
  notebooks: 0.1,
  "componentes-pc": 0.1,
  televisores: 0.1,
  audio: 0.1,
  "consolas-videojuegos": 0.1,
  electrodomesticos: 0.08,
  herramientas: 0.08,
  indumentaria: 0.25,
  supermercado: 0.15,
};

const DEFAULT_THRESHOLD = 0.1;
const PRE_EVENT_RISE_THRESHOLD = 0.15; // +15% en los días previos = patrón sospechoso
const PRE_EVENT_LOOKBACK_DAYS = 14;

export function getCategoryDiscountThreshold(categorySlug?: string | null): number {
  if (!categorySlug) return DEFAULT_THRESHOLD;
  return CATEGORY_DISCOUNT_THRESHOLDS[categorySlug] ?? DEFAULT_THRESHOLD;
}

const PRESENTATION: Record<DealVerdict, { label: string; emoji: string }> = {
  REAL: { label: "Oferta real", emoji: "✅" },
  MINOR: { label: "Descuento menor", emoji: "⚠️" },
  INFLATED: { label: "Oferta inflada", emoji: "🚫" },
  NO_DATA: { label: "Sin datos suficientes", emoji: "🔹" },
};

export function getDealVerdictPresentation(verdict: DealVerdict) {
  return PRESENTATION[verdict];
}

/** Suba porcentual del precio en los últimos `lookbackDays` días. */
function getRecentRise(
  history: PriceHistoryPoint[],
  currentPrice: number,
  lookbackDays: number,
): number | null {
  const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
  const recent = [...history]
    .filter((point) => new Date(point.recordedAt).getTime() >= cutoff)
    .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt));

  if (recent.length < 2 || recent[0].price <= 0) {
    return null;
  }

  return (currentPrice - recent[0].price) / recent[0].price;
}

function detectPreEventInflation(
  history: PriceHistoryPoint[],
  currentPrice: number,
  now: Date,
): PreEventInflation | null {
  const event = getRelevantEvent(now);

  if (!event) return null;

  const rise = getRecentRise(history, currentPrice, PRE_EVENT_LOOKBACK_DAYS);

  if (rise === null || rise <= PRE_EVENT_RISE_THRESHOLD) {
    return null;
  }

  return { event, risePercent: rise };
}

export function detectDealQuality({
  currentPrice,
  history,
  categorySlug,
  now = new Date(),
}: {
  currentPrice: number;
  history: PriceHistoryPoint[];
  categorySlug?: string | null;
  now?: Date;
}): DealQuality {
  const threshold = getCategoryDiscountThreshold(categorySlug);
  const stats = calculatePriceHistoryStats(history, currentPrice);
  const avg60 = getAveragePrice(history, 60);

  if (!stats.isSufficient || avg60 === null || avg60 <= 0) {
    return {
      verdict: "NO_DATA",
      ...PRESENTATION.NO_DATA,
      reason:
        "Todavía no tenemos suficiente historial verificado (mínimo 14 capturas en 60 días) para evaluar esta oferta.",
      avg60,
      discountPercent: null,
      threshold,
      preEventInflation: null,
    };
  }

  const discountPercent = (avg60 - currentPrice) / avg60;
  const preEventInflation = detectPreEventInflation(history, currentPrice, now);

  // Precio por encima del promedio de 60 días → la "oferta" es más cara que lo habitual.
  if (currentPrice > avg60) {
    const base =
      "El precio actual está por encima del promedio de los últimos 60 días: el descuento podría ser simulado.";

    return {
      verdict: "INFLATED",
      ...PRESENTATION.INFLATED,
      reason: preEventInflation
        ? `${base} Además subió ${Math.round(preEventInflation.risePercent * 100)}% en los días previos a ${preEventInflation.event.name}.`
        : base,
      avg60,
      discountPercent,
      threshold,
      preEventInflation,
    };
  }

  // Subió fuerte antes del evento y "bajó" apenas: patrón inflado aunque hoy esté igual o algo más barato.
  if (preEventInflation && discountPercent < threshold) {
    return {
      verdict: "INFLATED",
      ...PRESENTATION.INFLATED,
      reason: `El precio subió ${Math.round(preEventInflation.risePercent * 100)}% en los días previos a ${preEventInflation.event.name}; el descuento actual no compensa esa suba.`,
      avg60,
      discountPercent,
      threshold,
      preEventInflation,
    };
  }

  if (discountPercent >= threshold) {
    return {
      verdict: "REAL",
      ...PRESENTATION.REAL,
      reason: `El precio está ${Math.round(discountPercent * 100)}% por debajo del promedio de los últimos 60 días. Es una baja real.`,
      avg60,
      discountPercent,
      threshold,
      preEventInflation,
    };
  }

  return {
    verdict: "MINOR",
    ...PRESENTATION.MINOR,
    reason: `El precio está apenas por debajo del promedio de 60 días (${Math.round(discountPercent * 100)}%). El descuento es menor al esperado para esta categoría.`,
    avg60,
    discountPercent,
    threshold,
    preEventInflation,
  };
}
