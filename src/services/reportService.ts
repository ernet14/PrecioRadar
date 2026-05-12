import { getPrismaClient } from "@/lib/prisma";
import type { ProviderProduct } from "@/providers/stores";
import {
  getMockProductDetailBySlug,
  type ProductDetail,
} from "@/services/productService";

export const PRODUCT_REPORT_REASONS = [
  "incorrect_price",
  "wrong_product_match",
  "broken_link",
  "suspicious_offer",
  "other",
] as const;

export type ProductReportReason = (typeof PRODUCT_REPORT_REASONS)[number];

export type CreateProductReportInput = {
  message?: string;
  offerKey?: string;
  productSlug: string;
  reason: string;
};

export type CreateProductReportResult =
  | { status: "created" }
  | { status: "database_unavailable"; reason: string }
  | { status: "invalid" }
  | { status: "not_found" }
  | { status: "error" };

const missingDatabaseReason =
  "Falta configurar DATABASE_URL o DIRECT_URL con la conexion Postgres de Supabase.";

function isReportReason(value: string): value is ProductReportReason {
  return PRODUCT_REPORT_REASONS.includes(value as ProductReportReason);
}

function createCategoryName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseOfferKey(offerKey: string) {
  const [storeSlug, ...externalIdParts] = offerKey.split(":");

  return {
    externalId: externalIdParts.join(":"),
    storeSlug,
  };
}

function findProductOffer(product: ProductDetail, offerKey: string) {
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

async function ensureProductForReport(product: ProductDetail) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  const categorySlug = product.categorySlug ?? "demo";
  const category = await prisma.category.upsert({
    where: { slug: categorySlug },
    update: { active: true },
    create: {
      active: true,
      description: "Categoria demo creada al reportar un producto.",
      featured: false,
      name: createCategoryName(categorySlug),
      slug: categorySlug,
    },
  });

  return prisma.product.upsert({
    where: { slug: product.slug },
    update: {
      brand: product.brand,
      categoryId: category.id,
      imageUrl: product.imageUrl,
      isDemo: true,
      model: product.model,
      name: product.name,
      normalizedName: product.normalizedName,
    },
    create: {
      brand: product.brand,
      categoryId: category.id,
      imageUrl: product.imageUrl,
      isDemo: true,
      model: product.model,
      name: product.name,
      normalizedName: product.normalizedName,
      slug: product.slug,
    },
  });
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
      active: true,
      baseUrl,
      isDemo: offer.isDemo,
      name: offer.storeName,
    },
    create: {
      active: true,
      affiliateEnabled: false,
      baseUrl,
      hasAffiliate: false,
      isDemo: offer.isDemo,
      name: offer.storeName,
      slug: offer.storeSlug,
    },
  });
}

async function ensureOfferForReport({
  offer,
  productId,
}: {
  offer: ProviderProduct;
  productId: string;
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
        externalId: offer.externalId,
        storeId: store.id,
      },
    },
    update: {
      affiliateUrl: null,
      available: offer.available,
      condition: offer.condition,
      currency: offer.currency,
      imageUrl: offer.imageUrl,
      isDemo: offer.isDemo,
      lastCheckedAt: offer.lastCheckedAt,
      price: offer.price,
      productId,
      productUrl: offer.productUrl,
      title: offer.title,
    },
    create: {
      affiliateUrl: null,
      available: offer.available,
      condition: offer.condition,
      currency: offer.currency,
      externalId: offer.externalId,
      imageUrl: offer.imageUrl,
      isDemo: offer.isDemo,
      lastCheckedAt: offer.lastCheckedAt,
      price: offer.price,
      productId,
      productUrl: offer.productUrl,
      storeId: store.id,
      title: offer.title,
    },
  });
}

function createReportMessage({
  message,
  offer,
  product,
}: {
  message?: string;
  offer?: ProviderProduct | null;
  product: ProductDetail;
}) {
  const details = [
    message?.trim(),
    `Producto: ${product.name} (${product.slug})`,
    offer ? `Oferta: ${offer.storeName} - ${offer.title}` : null,
  ].filter(Boolean);

  return details.join("\n");
}

export async function createProductReport(
  userId: string | null | undefined,
  input: CreateProductReportInput,
): Promise<CreateProductReportResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", reason: missingDatabaseReason };
  }

  if (!input.productSlug || !isReportReason(input.reason)) {
    return { status: "invalid" };
  }

  const product = getMockProductDetailBySlug(input.productSlug);

  if (!product) {
    return { status: "not_found" };
  }

  try {
    const reportProduct = await ensureProductForReport(product);

    if (!reportProduct) {
      return { status: "not_found" };
    }

    const offer = input.offerKey
      ? findProductOffer(product, input.offerKey)
      : null;

    if (input.offerKey && !offer) {
      return { status: "not_found" };
    }

    const reportOffer = offer
      ? await ensureOfferForReport({
          offer,
          productId: reportProduct.id,
        })
      : null;

    await prisma.productReport.create({
      data: {
        message: createReportMessage({
          message: input.message,
          offer,
          product,
        }),
        offerId: reportOffer?.id ?? null,
        productId: reportProduct.id,
        reason: input.reason,
        userId: userId ?? null,
      },
    });

    return { status: "created" };
  } catch (error) {
    console.error("Unable to create product report.", error);
    return { status: "error" };
  }
}
