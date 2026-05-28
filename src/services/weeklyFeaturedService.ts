import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getPurchaseRecommendation } from "@/services/recommendationService";
import {
  getMockProductDetailBySlug,
  getAllMockProductSlugs,
  type ProductSummary,
} from "@/services/productService";
import type { FeaturedProductsResult } from "@/services/featuredProductsService";
import type { PriceHistoryPoint } from "@/services/priceHistoryService";
import type { ProviderProduct } from "@/providers/stores/types";
import type { CurrencyCode, ProductCondition } from "@/types";

function db() {
  const client = getPrismaClient();
  if (!client) throw new Error("Database not configured");
  return client;
}

// Lunes de la semana que contiene `date`, a medianoche UTC.
function getWeekStart(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0=Dom … 6=Sáb
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
  return d;
}

type ScoredEntry = {
  slug: string;
  productId: string | null;
  name: string;
  imageUrl: string | null;
  price: number;
  storeName: string;
  score: number;
  reason: string;
  categorySlug: string;
  isDemo: boolean;
};

type GenerateResult = {
  status: "generated" | "skipped" | "database_unavailable" | "error";
  count: number;
  reason?: string;
};

// Puntaje base según nivel de recomendación.
const LEVEL_SCORE: Record<string, number> = {
  EXCELLENT_PRICE: 100,
  GOOD_PRICE: 80,
  NORMAL_PRICE: 50,
  WAIT: 38,
  EXPENSIVE: 20,
  INFLATED_OFFER: 5,
  INSUFFICIENT_DATA: 10,
};

async function scoreRealProducts(excludeSlugs: Set<string>): Promise<ScoredEntry[]> {
  const candidates = await db().product.findMany({
    where: {
      isDemo: false,
      deletedAt: null,
      offers: { some: { available: true, isDemo: false } },
    },
    take: 300,
    include: {
      category: { select: { slug: true } },
      offers: {
        where: { available: true, isDemo: false },
        include: { store: { select: { name: true, slug: true } } },
        orderBy: { price: "asc" },
        take: 5,
      },
      priceHistory: {
        where: { isDemo: false },
        orderBy: { recordedAt: "desc" },
        take: 90,
      },
    },
  });

  const scored: ScoredEntry[] = [];

  for (const product of candidates) {
    if (product.offers.length === 0) continue;

    const bestOffer = product.offers[0];
    const currentPrice = Number(bestOffer.price);

    const history: PriceHistoryPoint[] = product.priceHistory.map((h) => ({
      date: h.recordedAt.toISOString().split("T")[0],
      recordedAt: h.recordedAt.toISOString(),
      price: Number(h.price),
      currency: h.currency as CurrencyCode,
      source: h.source,
      isDemo: h.isDemo,
    }));

    const providerProduct: ProviderProduct = {
      externalId: bestOffer.externalId ?? "",
      provider: bestOffer.store.slug,
      slug: product.slug,
      storeSlug: bestOffer.store.slug,
      storeName: bestOffer.store.name,
      title: product.name,
      name: product.name,
      normalizedName: product.normalizedName,
      brand: product.brand,
      model: product.model,
      categorySlug: product.category.slug,
      imageUrl: bestOffer.imageUrl ?? product.imageUrl,
      productUrl: bestOffer.productUrl,
      price: currentPrice,
      currency: bestOffer.currency as CurrencyCode,
      condition: bestOffer.condition as ProductCondition,
      available: bestOffer.available,
      isDemo: false,
      lastCheckedAt: bestOffer.lastCheckedAt ?? new Date(),
    };

    const recommendation = getPurchaseRecommendation({
      product: providerProduct,
      history,
      currentPrice,
    });

    if (recommendation.level === "INFLATED_OFFER") continue;

    const storeCount = product.offers.length;
    const score = (LEVEL_SCORE[recommendation.level] ?? 10) + (storeCount >= 2 ? 10 : 0);

    scored.push({
      slug: product.slug,
      productId: product.id,
      name: product.name,
      imageUrl: bestOffer.imageUrl ?? product.imageUrl ?? null,
      price: currentPrice,
      storeName: bestOffer.store.name,
      score,
      reason: recommendation.label,
      categorySlug: product.category.slug,
      isDemo: false,
    });
  }

  scored.sort((a, b) => b.score - a.score);

  // Seleccionar con diversidad de categorías (max 3 por categoría).
  // Primer intento: excluir semana anterior. Si no alcanza el mínimo, segundo intento sin exclusión.
  function pickWithDiversity(pool: ScoredEntry[], exclude: Set<string>): ScoredEntry[] {
    const catCount = new Map<string, number>();
    const MAX_PER_CAT = 3;
    const TARGET = 20;
    const selected: ScoredEntry[] = [];

    for (const entry of pool) {
      if (selected.length >= TARGET) break;
      if (exclude.has(entry.slug)) continue;
      const c = catCount.get(entry.categorySlug) ?? 0;
      if (c >= MAX_PER_CAT) continue;
      catCount.set(entry.categorySlug, c + 1);
      selected.push(entry);
    }
    return selected;
  }

  const firstPass = pickWithDiversity(scored, excludeSlugs);
  if (firstPass.length >= 10) return firstPass;

  // Segundo intento: permitir semana anterior para completar.
  const usedSlugs = new Set(firstPass.map((e) => e.slug));
  const secondPass = pickWithDiversity(
    scored.filter((e) => !usedSlugs.has(e.slug)),
    new Set(), // sin exclusión
  );
  return [...firstPass, ...secondPass].slice(0, 20);
}

function loadDemoFill(count: number, excludeSlugs: Set<string>): ScoredEntry[] {
  const allSlugs = getAllMockProductSlugs().filter((s) => !excludeSlugs.has(s));
  const entries: ScoredEntry[] = [];

  for (const slug of allSlugs) {
    if (entries.length >= count) break;
    const detail = getMockProductDetailBySlug(slug);
    if (!detail) continue;
    entries.push({
      slug: detail.slug,
      productId: null,
      name: detail.name,
      imageUrl: detail.imageUrl ?? null,
      price: detail.bestOffer.price,
      storeName: detail.bestOffer.storeName,
      score: 0,
      reason: "Historial inicial",
      categorySlug: detail.categorySlug ?? "general",
      isDemo: true,
    });
  }
  return entries;
}

export async function generateWeeklyFeaturedProducts(opts?: {
  force?: boolean;
}): Promise<GenerateResult> {
  try {
    const weekStart = getWeekStart();

    if (opts?.force) {
      await db().weeklyFeaturedProduct.deleteMany({ where: { weekStart } });
    } else {
      const existing = await db().weeklyFeaturedProduct.count({ where: { weekStart } });
      if (existing > 0) return { status: "skipped", count: existing };
    }

    // Slugs de la semana anterior para intentar no repetirlos.
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7);
    const prevSlugs = await db()
      .weeklyFeaturedProduct.findMany({
        where: { weekStart: prevWeekStart },
        select: { slug: true },
      })
      .then((rows) => new Set(rows.map((r) => r.slug)));

    const realEntries = await scoreRealProducts(prevSlugs);

    const TARGET_MIN = 10;
    let entries = realEntries.slice(0, 20);

    if (entries.length < TARGET_MIN) {
      const usedSlugs = new Set(entries.map((e) => e.slug));
      const demoFill = loadDemoFill(TARGET_MIN - entries.length, usedSlugs);
      entries = [...entries, ...demoFill];
    }

    await db().weeklyFeaturedProduct.createMany({
      data: entries.map((entry, i) => ({
        weekStart,
        slug: entry.slug,
        productId: entry.productId,
        rank: i + 1,
        score: entry.score,
        reason: entry.reason,
        isDemo: entry.isDemo,
        name: entry.name,
        imageUrl: entry.imageUrl,
        price: entry.price,
        storeName: entry.storeName,
      })),
    });

    logger.info("WeeklyFeatured generated", { metadata: { weekStart, count: entries.length } });
    return { status: "generated", count: entries.length };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("connect") || msg.includes("timeout")) {
      return { status: "database_unavailable", count: 0, reason: msg };
    }
    logger.error("WeeklyFeatured generation failed", { error: msg });
    return { status: "error", count: 0, reason: msg };
  }
}

export async function getWeeklyFeaturedForHome(): Promise<FeaturedProductsResult> {
  try {
    const client = getPrismaClient();
    if (!client) throw new Error("no client");

    const thisWeekStart = getWeekStart();

    // Buscar la selección más reciente (semana actual o anterior).
    const latestWeek = await client.weeklyFeaturedProduct.findFirst({
      where: { weekStart: { lte: thisWeekStart } },
      orderBy: { weekStart: "desc" },
      select: { weekStart: true },
    });

    if (!latestWeek) return { source: "demo", products: [] };

    const rows = await client.weeklyFeaturedProduct.findMany({
      where: { weekStart: latestWeek.weekStart },
      orderBy: { rank: "asc" },
    });

    if (rows.length === 0) return { source: "demo", products: [] };

    const products: ProductSummary[] = rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      imageUrl: row.imageUrl,
      price: Number(row.price),
      storeName: row.storeName,
      recommendationLabel: row.reason,
      isDemo: row.isDemo,
    }));

    return { source: "weekly", products };
  } catch {
    return { source: "demo", products: [] };
  }
}

export type WeeklyFeaturedRow = {
  id: string;
  weekStart: Date;
  slug: string;
  rank: number;
  score: number;
  reason: string;
  isDemo: boolean;
  pinned: boolean;
  name: string;
  imageUrl: string | null;
  price: number;
  storeName: string;
  createdAt: Date;
};

export async function listCurrentWeeklyFeatured(): Promise<WeeklyFeaturedRow[]> {
  const thisWeekStart = getWeekStart();

  const latestWeek = await db().weeklyFeaturedProduct.findFirst({
    where: { weekStart: { lte: thisWeekStart } },
    orderBy: { weekStart: "desc" },
    select: { weekStart: true },
  });

  if (!latestWeek) return [];

  const rows = await db().weeklyFeaturedProduct.findMany({
    where: { weekStart: latestWeek.weekStart },
    orderBy: { rank: "asc" },
  });

  return rows.map((row) => ({
    ...row,
    price: Number(row.price),
  }));
}
