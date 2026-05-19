import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getMockProductDetailBySlug } from "@/services/productService";
import {
  ensureProductForSlug,
  ensureProductOffer,
  findProductOffer,
} from "@/services/trackedProductService";
import type { ProviderProduct } from "@/providers/stores";

export type OfferClickTarget = {
  offer: ProviderProduct;
  productSlug: string;
};

export type AffiliateLinkCandidate = {
  affiliateUrl: string;
  originalUrl: string;
  productId: string | null;
};

export type RecordOfferClickResult =
  | { isAffiliate: boolean; status: "tracked"; url: string }
  | { isAffiliate: false; status: "database_unavailable"; url: string }
  | { isAffiliate: false; status: "error"; url: string }
  | { status: "not_found" };

export function buildOfferClickHref({
  offerKey,
  productSlug,
}: {
  offerKey: string;
  productSlug: string;
}) {
  const params = new URLSearchParams({
    offer: offerKey,
    slug: productSlug,
  });

  return `/api/out?${params.toString()}`;
}

export function getOfferClickTarget({
  offerKey,
  productSlug,
}: {
  offerKey: string;
  productSlug: string;
}): OfferClickTarget | null {
  const product = getMockProductDetailBySlug(productSlug);

  if (!product) {
    return null;
  }

  const offer = findProductOffer(product, offerKey);

  if (!offer) {
    return null;
  }

  return {
    offer,
    productSlug: product.slug,
  };
}

export function getAffiliateDestination({
  affiliateEnabled,
  affiliateLinks,
  affiliateTag,
  offerAffiliateUrl,
  productId,
  productUrl,
}: {
  affiliateEnabled: boolean;
  affiliateLinks: AffiliateLinkCandidate[];
  affiliateTag?: string;
  offerAffiliateUrl?: string | null;
  productId: string;
  productUrl: string;
}) {
  if (!affiliateEnabled) {
    return { isAffiliate: false, url: productUrl };
  }

  const directAffiliateUrl = offerAffiliateUrl?.trim();

  if (directAffiliateUrl) {
    return { isAffiliate: true, url: directAffiliateUrl };
  }

  const productAffiliateUrl = affiliateLinks.find(
    (link) => link.productId === productId && link.affiliateUrl.trim(),
  )?.affiliateUrl;

  if (productAffiliateUrl) {
    return { isAffiliate: true, url: productAffiliateUrl };
  }

  const urlAffiliateUrl = affiliateLinks.find(
    (link) => link.originalUrl === productUrl && link.affiliateUrl.trim(),
  )?.affiliateUrl;

  if (urlAffiliateUrl) {
    return { isAffiliate: true, url: urlAffiliateUrl };
  }

  if (affiliateTag) {
    try {
      const tagged = new URL(productUrl);
      tagged.searchParams.set("custom_id", affiliateTag);
      return { isAffiliate: true, url: tagged.toString() };
    } catch {
      // URL inválida — caer al fallback
    }
  }

  return { isAffiliate: false, url: productUrl };
}

export async function recordOfferClick({
  offerKey,
  productSlug,
  userId,
}: {
  offerKey: string;
  productSlug: string;
  userId?: string | null;
}): Promise<RecordOfferClickResult> {
  const target = getOfferClickTarget({ offerKey, productSlug });

  if (!target) {
    return { status: "not_found" };
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    return {
      isAffiliate: false,
      status: "database_unavailable",
      url: target.offer.productUrl,
    };
  }

  try {
    const product = await ensureProductForSlug(target.productSlug);

    if (!product) {
      return {
        isAffiliate: false,
        status: "error",
        url: target.offer.productUrl,
      };
    }

    const productOffer = await ensureProductOffer({
      offer: target.offer,
      productId: product.id,
    });

    if (!productOffer) {
      return {
        isAffiliate: false,
        status: "error",
        url: target.offer.productUrl,
      };
    }

    const storedOffer = await prisma.productOffer.findUnique({
      include: {
        store: {
          select: {
            affiliateEnabled: true,
          },
        },
      },
      where: { id: productOffer.id },
    });

    if (!storedOffer) {
      return {
        isAffiliate: false,
        status: "error",
        url: target.offer.productUrl,
      };
    }

    const affiliateLinks = storedOffer.store.affiliateEnabled
      ? await prisma.affiliateLink.findMany({
          select: {
            affiliateUrl: true,
            originalUrl: true,
            productId: true,
          },
          where: {
            active: true,
            storeId: storedOffer.storeId,
            OR: [
              { productId: storedOffer.productId },
              { originalUrl: storedOffer.productUrl },
            ],
          },
        })
      : [];
    const affiliateTag = process.env.MERCADOLIBRE_AFFILIATE_TAG?.trim() || undefined;
    const destination = getAffiliateDestination({
      affiliateEnabled: storedOffer.store.affiliateEnabled,
      affiliateLinks,
      affiliateTag,
      offerAffiliateUrl: storedOffer.affiliateUrl,
      productId: storedOffer.productId,
      productUrl: storedOffer.productUrl,
    });

    await prisma.clickTracking.create({
      data: {
        isAffiliate: destination.isAffiliate,
        offerId: storedOffer.id,
        productId: storedOffer.productId,
        storeId: storedOffer.storeId,
        url: destination.url,
        userId: userId ?? null,
      },
    });

    return {
      isAffiliate: destination.isAffiliate,
      status: "tracked",
      url: destination.url,
    };
  } catch (error) {
    logger.error("Unable to record offer click.", { error });
    return {
      isAffiliate: false,
      status: "error",
      url: target.offer.productUrl,
    };
  }
}
