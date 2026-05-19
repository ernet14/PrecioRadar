import type { ProductDetail } from "@/services/productService";
import { getAbsoluteUrl, getSiteUrl } from "@/lib/seo/site";

const siteUrl = getSiteUrl();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getPriceValidUntil() {
  return new Date(Date.now() + ONE_DAY_MS).toISOString().split("T")[0];
}

function buildDescription(product: ProductDetail) {
  const parts: string[] = [
    `Compará el precio de ${product.name} en Argentina.`,
  ];

  if (product.offers.length > 1) {
    parts.push(`${product.offers.length} ofertas comparadas con historial real.`);
  }

  if (product.brand) {
    parts.push(`Marca: ${product.brand}.`);
  }

  if (product.model) {
    parts.push(`Modelo: ${product.model}.`);
  }

  return parts.join(" ");
}

export function buildProductJsonLd(product: ProductDetail) {
  const validUntil = getPriceValidUntil();

  const offers = product.offers
    .filter((o) => o.available)
    .map((o) => ({
      "@type": "Offer",
      price: String(o.price),
      priceCurrency: "ARS",
      availability: "https://schema.org/InStock",
      url: getAbsoluteUrl(`/producto/${product.slug}`),
      priceValidUntil: validUntil,
      seller: { "@type": "Organization", name: o.storeName },
    }));

  const prices = product.offers.filter((o) => o.available).map((o) => o.price);
  const lowPrice = prices.length ? Math.min(...prices) : product.bestOffer.price;
  const highPrice = prices.length ? Math.max(...prices) : product.bestOffer.price;

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: buildDescription(product),
    sku: product.bestOffer.externalId,
    productID: product.slug,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    ...(product.imageUrl ? { image: product.imageUrl } : {}),
    offers:
      offers.length === 1
        ? offers[0]
        : {
            "@type": "AggregateOffer",
            lowPrice: String(lowPrice),
            highPrice: String(highPrice),
            offerCount: offers.length,
            priceCurrency: "ARS",
            priceValidUntil: validUntil,
            offers,
          },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Buscar",
        item: getAbsoluteUrl("/buscar"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: getAbsoluteUrl(`/producto/${product.slug}`),
      },
    ],
  };

  return [productSchema, breadcrumbSchema];
}
