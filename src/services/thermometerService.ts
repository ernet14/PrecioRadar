import { getPrismaClient } from "@/lib/prisma";
import {
  detectDealQuality,
  type DealQuality,
  type DealVerdict,
} from "@/services/fakeDiscountService";
import type { PriceHistoryPoint } from "@/services/priceHistoryService";
import type { CurrencyCode } from "@/types";

// Termómetro de ofertas: agrega el veredicto del detector sobre el catálogo real
// para mostrar el panorama del mercado (roadmap Etapa 12, tarea 5 — linkbait/PR).

export type ThermometerEntry = {
  slug: string;
  name: string;
  storeName: string;
  price: number;
  dealQuality: DealQuality;
};

export type ThermometerSummary = {
  total: number;
  evaluated: number; // productos con historial suficiente (excluye NO_DATA)
  counts: Record<DealVerdict, number>;
  inflatedExamples: ThermometerEntry[];
  realExamples: ThermometerEntry[];
};

const MAX_PRODUCTS = 200;
const EXAMPLES_LIMIT = 6;

function emptySummary(): ThermometerSummary {
  return {
    total: 0,
    evaluated: 0,
    counts: { REAL: 0, MINOR: 0, INFLATED: 0, NO_DATA: 0 },
    inflatedExamples: [],
    realExamples: [],
  };
}

export async function getDealThermometer(): Promise<ThermometerSummary> {
  const prisma = getPrismaClient();

  if (!prisma) return emptySummary();

  try {
    const products = await prisma.product.findMany({
      where: { deletedAt: null, isDemo: false },
      include: {
        category: true,
        offers: {
          where: { isDemo: false, available: true },
          orderBy: { price: "asc" },
          take: 1,
          include: { store: true },
        },
      },
      take: MAX_PRODUCTS,
    });

    const withOffer = products.filter(
      (product) => product.offers.length > 0 && !product.offers[0].store.deletedAt,
    );

    if (withOffer.length === 0) return emptySummary();

    const offerIds = withOffer.map((product) => product.offers[0].id);
    const historyRows = await prisma.priceHistory.findMany({
      where: { offerId: { in: offerIds }, isDemo: false },
      orderBy: { recordedAt: "asc" },
    });

    const historyByOffer = new Map<string, PriceHistoryPoint[]>();
    for (const row of historyRows) {
      if (!row.offerId) continue;
      const points = historyByOffer.get(row.offerId) ?? [];
      points.push({
        date: row.recordedAt.toISOString().slice(0, 10),
        recordedAt: row.recordedAt.toISOString(),
        price: Number(row.price),
        currency: row.currency as CurrencyCode,
        source: row.source,
        isDemo: false,
      });
      historyByOffer.set(row.offerId, points);
    }

    const summary = emptySummary();
    const entries: ThermometerEntry[] = [];

    for (const product of withOffer) {
      const offer = product.offers[0];
      const price = Number(offer.price);
      const dealQuality = detectDealQuality({
        currentPrice: price,
        history: historyByOffer.get(offer.id) ?? [],
        categorySlug: product.category?.slug ?? null,
      });

      summary.total += 1;
      summary.counts[dealQuality.verdict] += 1;
      if (dealQuality.verdict !== "NO_DATA") summary.evaluated += 1;

      entries.push({
        slug: product.slug,
        name: product.name,
        storeName: offer.store.name,
        price,
        dealQuality,
      });
    }

    summary.inflatedExamples = entries
      .filter((entry) => entry.dealQuality.verdict === "INFLATED")
      .slice(0, EXAMPLES_LIMIT);
    summary.realExamples = entries
      .filter((entry) => entry.dealQuality.verdict === "REAL")
      .sort(
        (left, right) =>
          (right.dealQuality.discountPercent ?? 0) -
          (left.dealQuality.discountPercent ?? 0),
      )
      .slice(0, EXAMPLES_LIMIT);

    return summary;
  } catch {
    return emptySummary();
  }
}

export function getVerdictPercent(summary: ThermometerSummary, verdict: DealVerdict) {
  if (summary.total === 0) return 0;
  return Math.round((summary.counts[verdict] / summary.total) * 100);
}
