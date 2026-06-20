import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { providerByStoreSlug } from "@/providers/stores";
import type { ProviderProduct } from "@/providers/stores/types";
import { getCanonicalProductKey, slugify } from "@/lib/utils";
import { normalizeCategorySlug, isFoodProduct } from "@/data/categories";

export type SnapshotResult = {
  status: "completed" | "database_unavailable" | "error" | "no_offers";
  processed: number;
  updated: number;
  errors: number;
  outliers: number;
};

const OUTLIER_LOWER_RATIO = 0.5;
const OUTLIER_UPPER_RATIO = 1.5;

function isOutlier(newPrice: number, lastPrice: number) {
  if (lastPrice <= 0) return false;
  return newPrice < lastPrice * OUTLIER_LOWER_RATIO || newPrice > lastPrice * OUTLIER_UPPER_RATIO;
}

function getStoreBaseUrl(productUrl: string): string {
  try {
    return new URL(productUrl).origin;
  } catch {
    return productUrl;
  }
}

// Límite defensivo de ofertas a persistir por búsqueda (evita inflar la DB).
const MAX_PERSIST_PER_SEARCH = 30;

async function ensureStore(
  prisma: NonNullable<ReturnType<typeof getPrismaClient>>,
  slug: string,
  name: string,
  baseUrl: string,
) {
  return prisma.store.upsert({
    where: { slug },
    create: { slug, name, baseUrl, active: true, hasAffiliate: false, affiliateEnabled: false },
    update: {},
  });
}

async function ensureCategory(
  prisma: NonNullable<ReturnType<typeof getPrismaClient>>,
  slug: string,
  name: string,
) {
  return prisma.category.upsert({
    where: { slug },
    create: { slug, name, active: true },
    update: {},
  });
}

async function ensureProduct(
  prisma: NonNullable<ReturnType<typeof getPrismaClient>>,
  offer: ProviderProduct,
  categoryId: string,
) {
  // Slug canónico (marca + SKU) cuando existe: hace que la MISMA oferta de
  // distintas tiendas caiga en un único Product y se compare entre tiendas.
  // Si no hay SKU confiable, cae al slug por nombre (sin agrupar cross-store).
  const productSlug =
    getCanonicalProductKey({ name: offer.name, brand: offer.brand, ean: offer.ean }) ??
    offer.slug ??
    slugify(offer.name);

  return prisma.product.upsert({
    where: { slug: productSlug },
    create: {
      slug: productSlug,
      name: offer.name,
      normalizedName: offer.normalizedName,
      brand: offer.brand ?? null,
      model: offer.model ?? null,
      categoryId,
      imageUrl: offer.imageUrl ?? null,
      isDemo: false,
    },
    update: { imageUrl: offer.imageUrl ?? null },
  });
}

async function upsertOffer(
  prisma: NonNullable<ReturnType<typeof getPrismaClient>>,
  offer: ProviderProduct,
  productId: string,
  storeId: string,
) {
  const existing = await prisma.productOffer.findFirst({
    where: { storeId, externalId: offer.externalId },
  });

  if (existing) {
    return prisma.productOffer.update({
      where: { id: existing.id },
      // Reasignamos productId: si la oferta venía bajo un Product viejo (slug
      // por nombre) la consolidamos en el Product canónico. El historial sigue
      // ligado por offerId, así que no se pierde.
      data: {
        productId,
        price: offer.price,
        available: offer.available,
        lastCheckedAt: offer.lastCheckedAt,
      },
    });
  }

  return prisma.productOffer.create({
    data: {
      productId,
      storeId,
      externalId: offer.externalId,
      title: offer.title,
      price: offer.price,
      currency: offer.currency,
      productUrl: offer.productUrl,
      imageUrl: offer.imageUrl ?? null,
      available: offer.available,
      condition: offer.condition,
      isDemo: false,
      lastCheckedAt: offer.lastCheckedAt,
    },
  });
}

async function recordTodayPriceHistory(
  prisma: NonNullable<ReturnType<typeof getPrismaClient>>,
  offerId: string,
  productId: string,
  storeId: string,
  offer: ProviderProduct,
  source: string,
) {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const existingToday = await prisma.priceHistory.findFirst({
    where: { offerId, recordedAt: { gte: dayStart }, isDemo: false },
  });

  if (!existingToday) {
    await prisma.priceHistory.create({
      data: {
        productId,
        storeId,
        offerId,
        price: offer.price,
        currency: offer.currency,
        source,
        isDemo: false,
        recordedAt: offer.lastCheckedAt,
      },
    });
  }
}

// Llamar fire-and-forget cuando el usuario ve un producto o aparece en búsqueda.
// Persiste en DB (cualquier provider real) para que el cron tenga qué actualizar.
export async function persistProductOfferView(offer: ProviderProduct): Promise<void> {
  if (offer.isDemo || !offer.externalId) return;
  // Sin alimentos por ahora: red de seguridad central para que ni la búsqueda en
  // vivo (súper Día/Vea/Jumbo/Carrefour/Más Online) meta comida en el catálogo.
  if (isFoodProduct(offer.name)) return;

  const prisma = getPrismaClient();

  if (!prisma) return;

  try {
    const store = await ensureStore(
      prisma,
      offer.storeSlug,
      offer.storeName,
      getStoreBaseUrl(offer.productUrl),
    );

    if (store.deletedAt) return;

    const categorySlug = normalizeCategorySlug({
      name: offer.name,
      slug: offer.categorySlug,
    }) ?? "general";
    const category = await ensureCategory(prisma, categorySlug, categorySlug);

    if (category.deletedAt) return;

    const product = await ensureProduct(prisma, offer, category.id);

    if (product.deletedAt) return;

    const productOffer = await upsertOffer(prisma, offer, product.id, store.id);

    await recordTodayPriceHistory(
      prisma,
      productOffer.id,
      product.id,
      store.id,
      offer,
      `${offer.provider}-view`,
    );
  } catch {
    // fire-and-forget: no propagamos errores de persistencia
  }
}

// Persiste un lote de ofertas reales de una búsqueda (demand-driven tracking):
// solo se trackea lo que la gente busca. Fire-and-forget, deduplicado y acotado.
export async function persistSearchResults(offers: ProviderProduct[]): Promise<void> {
  const unique = new Map<string, ProviderProduct>();
  for (const offer of offers) {
    if (offer.isDemo || !offer.externalId) continue;
    unique.set(`${offer.storeSlug}:${offer.externalId}`, offer);
  }

  // Secuencial a propósito: upserts paralelos de Store/Category/Product
  // compartidos producen carreras (unique violation) porque el upsert de
  // Prisma no es atómico. Es fire-and-forget, no bloquea la respuesta.
  const capped = Array.from(unique.values()).slice(0, MAX_PERSIST_PER_SEARCH);
  for (const offer of capped) {
    await persistProductOfferView(offer);
  }
}

// Llamado por el cron. Refresca precios de todas las ofertas no-demo en DB.
export async function snapshotCurrentPrices(): Promise<SnapshotResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", processed: 0, updated: 0, errors: 0, outliers: 0 };
  }

  const jobStart = Date.now();
  let job: { id: string } | null = null;

  try {
    job = await prisma.scrapeJob.create({
      data: {
        provider: "all",
        action: "refreshPrices",
        status: "running",
      },
      select: { id: true },
    });
  } catch (error) {
    logger.error("Unable to create scrape job.", {
      error,
      route: "priceSnapshotService.snapshotCurrentPrices",
    });
  }

  try {
    // Tiendas con provider real (MercadoLibre + VTEX). Routeamos cada oferta
    // a su provider para refrescar el precio.
    const providerSlugs = Array.from(providerByStoreSlug.keys());
    const stores = await prisma.store.findMany({
      where: { slug: { in: providerSlugs }, deletedAt: null },
    });
    const storeIdToSlug = new Map(stores.map((store) => [store.id, store.slug]));
    // Tiendas auto-bloqueadas por el monitor (p. ej. 403 repetidos): se saltean
    // hasta que expire blockedUntil.
    const now = Date.now();
    const blockedStoreIds = new Set(
      stores.filter((store) => store.blockedUntil && store.blockedUntil.getTime() > now).map((store) => store.id),
    );

    if (stores.length === 0) {
      await finalizeJob(prisma, job, jobStart, "no_offers", 0, 0, 0, 0);
      return { status: "no_offers", processed: 0, updated: 0, errors: 0, outliers: 0 };
    }

    const offers = await prisma.productOffer.findMany({
      orderBy: [{ lastCheckedAt: "asc" }, { createdAt: "asc" }],
      take: 500,
      where: {
        storeId: { in: stores.map((store) => store.id) },
        isDemo: false,
        available: true,
        externalId: { not: null },
        product: { deletedAt: null },
      },
    });

    if (offers.length === 0) {
      await finalizeJob(prisma, job, jobStart, "no_offers", 0, 0, 0, 0);
      return { status: "no_offers", processed: 0, updated: 0, errors: 0, outliers: 0 };
    }

    let updated = 0;
    let errors = 0;
    let outliers = 0;
    const windowStart = new Date(Date.now() - 4 * 60 * 60 * 1000);

    for (const offer of offers) {
      try {
        // Tienda auto-bloqueada en DB: saltear sin reintentar ni contar error.
        if (blockedStoreIds.has(offer.storeId)) {
          continue;
        }

        const storeSlug = storeIdToSlug.get(offer.storeId);
        const provider = storeSlug ? providerByStoreSlug.get(storeSlug) : undefined;

        if (!provider) {
          errors += 1;
          continue;
        }

        // Provider bloqueado por código (p. ej. Frávega con 403): bloqueo
        // PERMANENTE, así que marcamos la oferta no disponible (no vuelve sola)
        // para que no cuente como "viva" en el scorecard. Distinto del skip de
        // blockedStoreIds (blockedUntil), que es temporal y sí debe volver.
        if (provider.blocked) {
          await prisma.productOffer.update({
            where: { id: offer.id },
            data: { available: false },
          });
          continue;
        }

        const currentPrice = await provider.getCurrentPrice({
          externalId: offer.externalId ?? undefined,
          lastKnownPrice: Number(offer.price),
          url: offer.productUrl,
        });

        if (!currentPrice) {
          errors += 1;
          continue;
        }

        if (!currentPrice.available) {
          await prisma.productOffer.update({
            where: { id: offer.id },
            data: {
              available: false,
              lastCheckedAt: currentPrice.lastCheckedAt,
            },
          });
          updated += 1;
          continue;
        }

        const lastPriceNumber = Number(offer.price);
        const outlier = isOutlier(currentPrice.price, lastPriceNumber);

        if (outlier) {
          outliers += 1;
          await prisma.providerLog.create({
            data: {
              storeId: offer.storeId,
              provider: storeSlug ?? "unknown",
              action: "cron.outlierDetected",
              status: "skipped",
              errorMessage: `Precio sospechoso ${currentPrice.price} vs último ${lastPriceNumber} (offer ${offer.id}).`,
            },
          });
          continue;
        }

        await prisma.productOffer.update({
          where: { id: offer.id },
          data: {
            price: currentPrice.price,
            available: currentPrice.available,
            lastCheckedAt: currentPrice.lastCheckedAt,
          },
        });

        const existingInWindow = await prisma.priceHistory.findFirst({
          where: { offerId: offer.id, recordedAt: { gte: windowStart }, isDemo: false },
        });

        if (!existingInWindow) {
          await prisma.priceHistory.create({
            data: {
              productId: offer.productId,
              storeId: offer.storeId,
              offerId: offer.id,
              price: currentPrice.price,
              currency: currentPrice.currency,
              source: `${storeSlug}-cron`,
              isDemo: false,
            },
          });
        }

        updated += 1;
      } catch {
        errors += 1;
      }
    }

    try {
      await prisma.providerLog.create({
        data: {
          provider: "all",
          action: "cron.refreshPrices",
          status: errors > 0 && updated === 0 ? "failed" : "success",
          errorMessage:
            errors > 0
              ? `${errors} errores de ${offers.length} ofertas procesadas.`
              : null,
        },
      });
    } catch (error) {
      logger.error("Unable to record refresh prices provider log.", {
        error,
        route: "priceSnapshotService.snapshotCurrentPrices",
      });
    }

    await finalizeJob(prisma, job, jobStart, "completed", offers.length, updated, errors, outliers);

    return { status: "completed", processed: offers.length, updated, errors, outliers };
  } catch (error) {
    logger.error("Unable to snapshot current prices.", {
      error,
      route: "priceSnapshotService.snapshotCurrentPrices",
    });
    await finalizeJob(prisma, job, jobStart, "error", 0, 0, 1, 0);
    return { status: "error", processed: 0, updated: 0, errors: 1, outliers: 0 };
  }
}

async function finalizeJob(
  prisma: NonNullable<ReturnType<typeof getPrismaClient>>,
  job: { id: string } | null,
  jobStart: number,
  status: SnapshotResult["status"],
  processed: number,
  updated: number,
  errors: number,
  outliers: number,
) {
  if (!job) return;

  try {
    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: {
        status,
        processed,
        updated,
        errors,
        outliers,
        finishedAt: new Date(),
        durationMs: Date.now() - jobStart,
      },
    });
  } catch (error) {
    logger.error("Unable to finalize scrape job.", {
      error,
      route: "priceSnapshotService.finalizeJob",
    });
  }
}
