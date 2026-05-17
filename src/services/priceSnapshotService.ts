import { getPrismaClient } from "@/lib/prisma";
import { mercadoLibreProvider } from "@/providers/stores";
import type { ProviderProduct } from "@/providers/stores/types";
import { slugify } from "@/lib/utils";

export type SnapshotResult = {
  status: "completed" | "database_unavailable" | "error" | "no_offers";
  processed: number;
  updated: number;
  errors: number;
};

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
  const productSlug = offer.slug ?? slugify(offer.name);

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
      data: { price: offer.price, available: offer.available, lastCheckedAt: offer.lastCheckedAt },
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

// Llamar fire-and-forget cuando el usuario ve un producto. Persiste en DB para que el cron tenga qué actualizar.
export async function persistProductOfferView(offer: ProviderProduct): Promise<void> {
  if (offer.isDemo || !offer.externalId) return;

  const prisma = getPrismaClient();

  if (!prisma) return;

  try {
    const store = await ensureStore(prisma, offer.storeSlug, offer.storeName, "https://www.mercadolibre.com.ar");
    const categorySlug = offer.categorySlug ?? "general";
    const category = await ensureCategory(prisma, categorySlug, categorySlug);
    const product = await ensureProduct(prisma, offer, category.id);
    const productOffer = await upsertOffer(prisma, offer, product.id, store.id);

    await recordTodayPriceHistory(prisma, productOffer.id, product.id, store.id, offer, "mercadolibre-view");
  } catch {
    // fire-and-forget: no propagamos errores de persistencia
  }
}

// Llamado por el cron. Refresca precios de todas las ofertas no-demo en DB.
export async function snapshotCurrentPrices(): Promise<SnapshotResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", processed: 0, updated: 0, errors: 0 };
  }

  try {
    const store = await prisma.store.findUnique({ where: { slug: "mercadolibre" } });

    if (!store) {
      return { status: "no_offers", processed: 0, updated: 0, errors: 0 };
    }

    const offers = await prisma.productOffer.findMany({
      orderBy: [{ lastCheckedAt: "asc" }, { createdAt: "asc" }],
      take: 500,
      where: {
        storeId: store.id,
        isDemo: false,
        available: true,
        externalId: { not: null },
      },
    });

    if (offers.length === 0) {
      return { status: "no_offers", processed: 0, updated: 0, errors: 0 };
    }

    let updated = 0;
    let errors = 0;
    const windowStart = new Date(Date.now() - 4 * 60 * 60 * 1000);

    for (const offer of offers) {
      try {
        const currentPrice = await mercadoLibreProvider.getCurrentPrice({
          externalId: offer.externalId ?? undefined,
        });

        if (!currentPrice) {
          errors += 1;
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
              storeId: store.id,
              offerId: offer.id,
              price: currentPrice.price,
              currency: currentPrice.currency,
              source: "mercadolibre-cron",
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
          storeId: store.id,
          provider: "mercadolibre",
          action: "cron.refreshPrices",
          status: errors > 0 && updated === 0 ? "failed" : "success",
          errorMessage:
            errors > 0
              ? `${errors} errores de ${offers.length} ofertas procesadas.`
              : null,
        },
      });
    } catch (error) {
      console.error("Unable to record refresh prices provider log.", error);
    }

    return { status: "completed", processed: offers.length, updated, errors };
  } catch (error) {
    console.error("Unable to snapshot current prices.", error);
    return { status: "error", processed: 0, updated: 0, errors: 1 };
  }
}
