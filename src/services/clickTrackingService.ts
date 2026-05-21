import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getProductDetailBySlug } from "@/services/productService";
import {
  buildProgramAffiliateUrl,
  getProgramAffiliateTag,
  normalizeAffiliateProgram,
  type AffiliateProgram,
} from "@/services/affiliateService";
import { track } from "@/services/analyticsService";
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
  program?: string | null;
};

export type AffiliateDestination = {
  isAffiliate: boolean;
  url: string;
  program: AffiliateProgram;
};

export type RecordOfferClickResult =
  | { isAffiliate: boolean; status: "tracked"; url: string; program: AffiliateProgram }
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

export async function getOfferClickTarget({
  offerKey,
  productSlug,
}: {
  offerKey: string;
  productSlug: string;
}): Promise<OfferClickTarget | null> {
  // Resuelve productos reales (DB) además del catálogo demo; antes era mock-only
  // y /api/out devolvía 404 para cualquier oferta de una tienda real.
  const product = await getProductDetailBySlug(productSlug);

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
  program = "mercadolibre",
}: {
  affiliateEnabled: boolean;
  affiliateLinks: AffiliateLinkCandidate[];
  affiliateTag?: string;
  offerAffiliateUrl?: string | null;
  productId: string;
  productUrl: string;
  program?: AffiliateProgram;
}): AffiliateDestination {
  if (!affiliateEnabled) {
    return { isAffiliate: false, url: productUrl, program: "none" };
  }

  const directAffiliateUrl = offerAffiliateUrl?.trim();

  if (directAffiliateUrl) {
    return { isAffiliate: true, url: directAffiliateUrl, program };
  }

  const productLink = affiliateLinks.find(
    (link) => link.productId === productId && link.affiliateUrl.trim(),
  );

  if (productLink) {
    return {
      isAffiliate: true,
      url: productLink.affiliateUrl,
      program: normalizeAffiliateProgram(productLink.program ?? program),
    };
  }

  const urlLink = affiliateLinks.find(
    (link) => link.originalUrl === productUrl && link.affiliateUrl.trim(),
  );

  if (urlLink) {
    return {
      isAffiliate: true,
      url: urlLink.affiliateUrl,
      program: normalizeAffiliateProgram(urlLink.program ?? program),
    };
  }

  const autoTaggedUrl = buildProgramAffiliateUrl({
    program,
    productUrl,
    tag: affiliateTag,
  });

  if (autoTaggedUrl) {
    return { isAffiliate: true, url: autoTaggedUrl, program };
  }

  return { isAffiliate: false, url: productUrl, program: "none" };
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
  const target = await getOfferClickTarget({ offerKey, productSlug });

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
            affiliateProgram: true,
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
            program: true,
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
    const storeProgram = normalizeAffiliateProgram(storedOffer.store.affiliateProgram);
    const affiliateTag = getProgramAffiliateTag(storeProgram);
    const destination = getAffiliateDestination({
      affiliateEnabled: storedOffer.store.affiliateEnabled,
      affiliateLinks,
      affiliateTag,
      offerAffiliateUrl: storedOffer.affiliateUrl,
      productId: storedOffer.productId,
      productUrl: storedOffer.productUrl,
      program: storeProgram,
    });

    await prisma.clickTracking.create({
      data: {
        isAffiliate: destination.isAffiliate,
        offerId: storedOffer.id,
        productId: storedOffer.productId,
        program: destination.isAffiliate ? destination.program : null,
        storeId: storedOffer.storeId,
        url: destination.url,
        userId: userId ?? null,
      },
    });

    void track({
      name: "outbound_click",
      props: {
        isAffiliate: destination.isAffiliate,
        program: destination.program,
        storeId: storedOffer.storeId,
      },
      userId: userId ?? null,
    });

    return {
      isAffiliate: destination.isAffiliate,
      program: destination.program,
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
