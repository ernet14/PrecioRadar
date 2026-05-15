import { getPrismaClient } from "@/lib/prisma";
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

    const isAffiliate = Boolean(
      storedOffer.affiliateUrl && storedOffer.store.affiliateEnabled,
    );
    const url = isAffiliate ? storedOffer.affiliateUrl! : storedOffer.productUrl;

    await prisma.clickTracking.create({
      data: {
        isAffiliate,
        offerId: storedOffer.id,
        productId: storedOffer.productId,
        storeId: storedOffer.storeId,
        url,
        userId: userId ?? null,
      },
    });

    return {
      isAffiliate,
      status: "tracked",
      url,
    };
  } catch (error) {
    console.error("Unable to record offer click.", error);
    return {
      isAffiliate: false,
      status: "error",
      url: target.offer.productUrl,
    };
  }
}
