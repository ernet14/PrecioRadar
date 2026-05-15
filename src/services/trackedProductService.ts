import { getPrismaClient } from "@/lib/prisma";
import { formatCurrencyARS } from "@/lib/utils";
import type { ProviderProduct } from "@/providers/stores";
import {
  getMockProductDetailBySlug,
  type ProductDetail,
} from "@/services/productService";

export const FREE_TRACKED_PRODUCT_LIMIT = 2;

export type TrackingOverview =
  | {
      status: "anonymous";
      limit: typeof FREE_TRACKED_PRODUCT_LIMIT;
      trackedCount: 0;
      trackedSlugs: Set<string>;
      trackedOfferKeys: Set<string>;
      reason?: string;
    }
  | {
      status: "ready";
      limit: typeof FREE_TRACKED_PRODUCT_LIMIT;
      trackedCount: number;
      trackedSlugs: Set<string>;
      trackedOfferKeys: Set<string>;
      reason?: string;
    }
  | {
      status: "unavailable";
      limit: typeof FREE_TRACKED_PRODUCT_LIMIT;
      trackedCount: 0;
      trackedSlugs: Set<string>;
      trackedOfferKeys: Set<string>;
      reason: string;
    };

export type FollowProductResult =
  | { status: "tracked" }
  | { status: "already_tracked" }
  | { status: "limit_reached"; limit: typeof FREE_TRACKED_PRODUCT_LIMIT }
  | { status: "not_found" }
  | { status: "database_unavailable"; reason: string }
  | { status: "error" };

export type UnfollowProductResult =
  | { status: "untracked" }
  | { status: "not_tracked" }
  | { status: "database_unavailable"; reason: string }
  | { status: "error" };

export type TrackedProductListItem = {
  id: string;
  slug: string;
  name: string;
  offerKey: string | null;
  imageUrl?: string | null;
  priceLabel: string;
  storeName: string;
  trackingLabel: string;
  trackingScope: "offer" | "product";
  productUrl: string;
  recommendationLabel: string;
  recommendationReason: string;
  trackedAt: Date;
};

const missingDatabaseReason =
  "Falta configurar DATABASE_URL o DIRECT_URL con la conexion Postgres de Supabase.";

function createCategoryName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function ensureProductForSlug(slug: string) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  const existingProduct = await prisma.product.findUnique({
    where: { slug },
  });

  if (existingProduct) {
    return existingProduct;
  }

  const mockDetail = getMockProductDetailBySlug(slug);

  if (!mockDetail) {
    return null;
  }

  const categorySlug = mockDetail.categorySlug ?? "demo";
  const category = await prisma.category.upsert({
    where: { slug: categorySlug },
    update: { active: true },
    create: {
      name: createCategoryName(categorySlug),
      slug: categorySlug,
      description: "Categoria demo creada al seguir un producto.",
      active: true,
      featured: false,
    },
  });

  return prisma.product.upsert({
    where: { slug: mockDetail.slug },
    update: {
      name: mockDetail.name,
      brand: mockDetail.brand,
      model: mockDetail.model,
      categoryId: category.id,
      imageUrl: mockDetail.imageUrl,
      normalizedName: mockDetail.normalizedName,
      isDemo: true,
    },
    create: {
      name: mockDetail.name,
      slug: mockDetail.slug,
      brand: mockDetail.brand,
      model: mockDetail.model,
      categoryId: category.id,
      imageUrl: mockDetail.imageUrl,
      normalizedName: mockDetail.normalizedName,
      isDemo: true,
    },
  });
}

export function getOfferKey(storeSlug: string, externalId: string) {
  return `${storeSlug}:${externalId}`;
}

export function parseOfferKey(offerKey: string) {
  const [storeSlug, ...externalIdParts] = offerKey.split(":");

  return {
    storeSlug,
    externalId: externalIdParts.join(":"),
  };
}

export function findProductOffer(product: ProductDetail, offerKey: string) {
  const { externalId, storeSlug } = parseOfferKey(offerKey);

  if (!storeSlug || !externalId) {
    return null;
  }

  return (
    product.offers.find(
      (offer) => offer.storeSlug === storeSlug && offer.externalId === externalId,
    ) ?? null
  );
}

async function ensureStoreForOffer(offer: ProviderProduct) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  const baseUrl = (() => {
    try {
      return new URL(offer.productUrl).origin;
    } catch {
      return offer.productUrl;
    }
  })();

  return prisma.store.upsert({
    where: { slug: offer.storeSlug },
    update: {
      name: offer.storeName,
      baseUrl,
      isDemo: offer.isDemo,
      active: true,
    },
    create: {
      name: offer.storeName,
      slug: offer.storeSlug,
      baseUrl,
      isDemo: offer.isDemo,
      hasAffiliate: false,
      affiliateEnabled: false,
      active: true,
    },
  });
}

export async function ensureProductOffer({
  offer,
  productId,
}: {
  productId: string;
  offer: ProviderProduct;
}) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  const store = await ensureStoreForOffer(offer);

  if (!store) {
    return null;
  }

  return prisma.productOffer.upsert({
    where: {
      storeId_externalId: {
        storeId: store.id,
        externalId: offer.externalId,
      },
    },
    update: {
      productId,
      title: offer.title,
      price: offer.price,
      currency: offer.currency,
      productUrl: offer.productUrl,
      affiliateUrl: null,
      imageUrl: offer.imageUrl,
      available: offer.available,
      condition: offer.condition,
      isDemo: offer.isDemo,
      lastCheckedAt: offer.lastCheckedAt,
    },
    create: {
      productId,
      storeId: store.id,
      externalId: offer.externalId,
      title: offer.title,
      price: offer.price,
      currency: offer.currency,
      productUrl: offer.productUrl,
      affiliateUrl: null,
      imageUrl: offer.imageUrl,
      available: offer.available,
      condition: offer.condition,
      isDemo: offer.isDemo,
      lastCheckedAt: offer.lastCheckedAt,
    },
  });
}

function createTrackedProductListItem(
  id: string,
  product: ProductDetail,
  offer: ProviderProduct,
  trackedAt: Date,
  trackingScope: "offer" | "product",
): TrackedProductListItem {
  return {
    id,
    slug: product.slug,
    name: product.name,
    offerKey: offer.externalId ? getOfferKey(offer.storeSlug, offer.externalId) : null,
    imageUrl: product.imageUrl ?? offer.imageUrl,
    priceLabel: formatCurrencyARS(offer.price),
    storeName: offer.storeName,
    trackingLabel:
      trackingScope === "offer"
        ? "Oferta seguida"
        : "Producto seguido (mejor oferta actual)",
    trackingScope,
    productUrl: offer.productUrl,
    recommendationLabel: product.recommendation.label,
    recommendationReason: product.recommendation.reason,
    trackedAt,
  };
}

export async function getTrackingOverviewForUser(
  userId: string | null | undefined,
): Promise<TrackingOverview> {
  if (!userId) {
    return {
      status: "anonymous",
      limit: FREE_TRACKED_PRODUCT_LIMIT,
      trackedCount: 0,
      trackedSlugs: new Set<string>(),
      trackedOfferKeys: new Set<string>(),
    };
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    return {
      status: "unavailable",
      limit: FREE_TRACKED_PRODUCT_LIMIT,
      trackedCount: 0,
      trackedSlugs: new Set<string>(),
      trackedOfferKeys: new Set<string>(),
      reason: missingDatabaseReason,
    };
  }

  try {
    const trackedProducts = await prisma.trackedProduct.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            slug: true,
          },
        },
        offer: {
          include: {
            store: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
    });

    return {
      status: "ready",
      limit: FREE_TRACKED_PRODUCT_LIMIT,
      trackedCount: trackedProducts.filter(
        (trackedProduct) => trackedProduct.offerId !== null,
      ).length,
      trackedSlugs: new Set(
        trackedProducts
          .filter((trackedProduct) => trackedProduct.offerId === null)
          .map((trackedProduct) => trackedProduct.product.slug),
      ),
      trackedOfferKeys: new Set(
        trackedProducts
          .map((trackedProduct) =>
            trackedProduct.offer?.externalId
              ? getOfferKey(
                  trackedProduct.offer.store.slug,
                  trackedProduct.offer.externalId,
                )
              : null,
          )
          .filter((offerKey): offerKey is string => Boolean(offerKey)),
      ),
    };
  } catch (error) {
    console.error("Unable to load tracked product overview.", error);
    return {
      status: "unavailable",
      limit: FREE_TRACKED_PRODUCT_LIMIT,
      trackedCount: 0,
      trackedSlugs: new Set<string>(),
      trackedOfferKeys: new Set<string>(),
      reason:
        "No pudimos leer tus ofertas seguidas por un error inesperado.",
    };
  }
}

export async function isProductTracked(userId: string, slug: string) {
  const overview = await getTrackingOverviewForUser(userId);
  return overview.status === "ready" && overview.trackedSlugs.has(slug);
}

export async function followProduct(
  userId: string,
  slug: string,
  offerKey: string,
): Promise<FollowProductResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", reason: missingDatabaseReason };
  }

  try {
    const mockDetail = getMockProductDetailBySlug(slug);

    if (!mockDetail) {
      return { status: "not_found" };
    }

    const offer = findProductOffer(mockDetail, offerKey);

    if (!offer) {
      return { status: "not_found" };
    }

    const product = await ensureProductForSlug(slug);

    if (!product) {
      return { status: "not_found" };
    }

    const productOffer = await ensureProductOffer({
      productId: product.id,
      offer,
    });

    if (!productOffer) {
      return { status: "not_found" };
    }

    const existingTrackedProduct = await prisma.trackedProduct.findFirst({
      where: {
        userId,
        offerId: productOffer.id,
      },
    });

    if (existingTrackedProduct) {
      return { status: "already_tracked" };
    }

    const trackedOfferCount = await prisma.trackedProduct.count({
      where: {
        userId,
        offerId: {
          not: null,
        },
      },
    });

    if (trackedOfferCount >= FREE_TRACKED_PRODUCT_LIMIT) {
      return {
        status: "limit_reached",
        limit: FREE_TRACKED_PRODUCT_LIMIT,
      };
    }

    await prisma.trackedProduct.create({
      data: {
        userId,
        productId: product.id,
        offerId: productOffer.id,
      },
    });

    return { status: "tracked" };
  } catch (error) {
    console.error("Unable to follow product.", error);
    return { status: "error" };
  }
}

export async function unfollowProduct(
  userId: string,
  trackedProductId: string,
): Promise<UnfollowProductResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", reason: missingDatabaseReason };
  }

  try {
    const result = await prisma.trackedProduct.deleteMany({
      where: {
        id: trackedProductId,
        userId,
      },
    });

    return result.count > 0 ? { status: "untracked" } : { status: "not_tracked" };
  } catch (error) {
    console.error("Unable to unfollow product.", error);
    return { status: "error" };
  }
}

export async function listTrackedProducts(
  userId: string,
): Promise<TrackedProductListItem[]> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return [];
  }

  const trackedProducts = await prisma.trackedProduct.findMany({
    where: { userId },
    include: {
      product: true,
      offer: {
        include: {
          store: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return trackedProducts
    .map((trackedProduct) => {
      const product = getMockProductDetailBySlug(trackedProduct.product.slug);

      if (!product) {
        return null;
      }

      const offer =
        trackedProduct.offer?.externalId && trackedProduct.offer.store
          ? findProductOffer(
              product,
              getOfferKey(
                trackedProduct.offer.store.slug,
                trackedProduct.offer.externalId,
              ),
            )
          : product.bestOffer;
      const trackingScope =
        trackedProduct.offer?.externalId && trackedProduct.offer.store
          ? "offer"
          : "product";

      if (!offer) {
        return null;
      }

      return createTrackedProductListItem(
        trackedProduct.id,
        product,
        offer,
        trackedProduct.createdAt,
        trackingScope,
      );
    })
    .filter((product): product is TrackedProductListItem => Boolean(product));
}
