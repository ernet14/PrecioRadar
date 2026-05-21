import { getPrismaClient } from "@/lib/prisma";
import {
  calculatePriceHistoryStats,
  type PriceHistoryPoint,
} from "@/services/priceHistoryService";
import type { CurrencyCode } from "@/types";

// Capa de datos de la API pública pagada (Etapa 18). Devuelve pricing + historial
// de un producto, con la profundidad de historial acotada por el tier.

export type ApiOffer = {
  store: string;
  storeSlug: string;
  price: number;
  currency: string;
  available: boolean;
  url: string;
};

export type ApiPricePoint = {
  recordedAt: string;
  price: number;
  currency: string;
  store: string;
};

export type ApiProductPricing = {
  slug: string;
  name: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  bestPrice: number | null;
  currency: string;
  offerCount: number;
  offers: ApiOffer[];
  stats: ReturnType<typeof calculatePriceHistoryStats>;
  historyDays: number | null;
  history: ApiPricePoint[];
};

export type ApiPricingResult =
  | { status: "ok"; data: ApiProductPricing }
  | { status: "not_found" }
  | { status: "database_unavailable" };

export async function getApiProductPricing(
  slug: string,
  historyDays: number | null,
): Promise<ApiPricingResult> {
  const prisma = getPrismaClient();
  if (!prisma) return { status: "database_unavailable" };

  const product = await prisma.product.findFirst({
    where: { slug, deletedAt: null, isDemo: false },
    include: {
      category: { select: { name: true } },
      offers: {
        where: { isDemo: false },
        include: { store: { select: { name: true, slug: true, deletedAt: true } } },
      },
    },
  });

  if (!product) return { status: "not_found" };

  const liveOffers = product.offers.filter((offer) => !offer.store.deletedAt);
  if (liveOffers.length === 0) return { status: "not_found" };

  const offers: ApiOffer[] = liveOffers
    .map((offer) => ({
      store: offer.store.name,
      storeSlug: offer.store.slug,
      price: Number(offer.price),
      currency: offer.currency,
      available: offer.available,
      url: offer.productUrl,
    }))
    .sort((left, right) => left.price - right.price);

  const cutoff = historyDays ? new Date(Date.now() - historyDays * 86_400_000) : null;
  const records = await prisma.priceHistory.findMany({
    where: {
      productId: product.id,
      isDemo: false,
      ...(cutoff ? { recordedAt: { gte: cutoff } } : {}),
    },
    orderBy: { recordedAt: "asc" },
    take: 2000,
    include: { store: { select: { name: true } } },
  });

  const history: ApiPricePoint[] = records.map((record) => ({
    recordedAt: record.recordedAt.toISOString(),
    price: Number(record.price),
    currency: record.currency,
    store: record.store.name,
  }));

  const bestPrice = offers[0]?.price ?? null;
  const statsInput: PriceHistoryPoint[] = records.map((record) => ({
    date: record.recordedAt.toISOString().slice(0, 10),
    recordedAt: record.recordedAt.toISOString(),
    price: Number(record.price),
    currency: record.currency as CurrencyCode,
    source: record.source,
    isDemo: false,
  }));

  return {
    status: "ok",
    data: {
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      model: product.model,
      category: product.category?.name ?? null,
      bestPrice,
      currency: offers[0]?.currency ?? "ARS",
      offerCount: offers.length,
      offers,
      stats: calculatePriceHistoryStats(statsInput, bestPrice ?? 0),
      historyDays,
      history,
    },
  };
}
