import { mercadoLibreProvider } from "@/providers/stores";
import type { ProviderProduct } from "@/providers/stores/types";
import { slugify } from "@/lib/utils";
import {
  getMockProductDetailBySlug,
  type ProductSummary,
} from "@/services/productService";

export type FeaturedSource = "mercadolibre" | "demo";

export type FeaturedProductsResult = {
  source: FeaturedSource;
  products: ProductSummary[];
};

const DEFAULT_QUERIES = [
  "Samsung Galaxy A55",
  "Notebook Lenovo IdeaPad Slim",
  "Smart TV Samsung 55",
  "Taladro Bosch",
];

const MOCK_FALLBACK_SLUGS = [
  "samsung-galaxy-a55-5g-256gb",
  "notebook-lenovo-ideapad-slim-5-ryzen-7",
  "smart-tv-samsung-crystal-uhd-55",
  "taladro-inalambrico-bosch-gsr-120-li",
];

function toSummary(product: ProviderProduct): ProductSummary {
  return {
    slug: product.slug ?? slugify(product.name),
    name: product.name,
    imageUrl: product.imageUrl,
    price: product.price,
    storeName: product.storeName,
    recommendationLabel: "Sin historial verificado",
  };
}

function loadMockFallback(): ProductSummary[] {
  return MOCK_FALLBACK_SLUGS.flatMap((slug) => {
    const detail = getMockProductDetailBySlug(slug);
    if (!detail) return [];
    return [
      {
        slug: detail.slug,
        name: detail.name,
        imageUrl: detail.imageUrl,
        price: detail.bestOffer.price,
        storeName: detail.bestOffer.storeName,
        recommendationLabel: detail.recommendation.label,
      },
    ];
  });
}

// Devuelve productos destacados con datos reales de MeLi cuando es posible.
// El provider ya cachea respuestas en MercadoLibreCache con TTL 1h por search,
// así que llamadas sucesivas durante esa ventana no pegan a la API externa.
// Si MeLi no devuelve nada (sin credenciales, circuit abierto, rate limit),
// usamos el catálogo demo como fallback para que la home no se vea vacía.
export async function getFeaturedProductsForHome(
  queries: string[] = DEFAULT_QUERIES,
): Promise<FeaturedProductsResult> {
  const results: ProductSummary[] = [];
  const seenSlugs = new Set<string>();

  for (const query of queries) {
    const products = await mercadoLibreProvider.searchProducts(query);

    if (products.length === 0) continue;

    const candidate = products[0];
    const summary = toSummary(candidate);

    if (seenSlugs.has(summary.slug)) continue;
    seenSlugs.add(summary.slug);
    results.push(summary);
  }

  if (results.length === 0) {
    return { products: loadMockFallback(), source: "demo" };
  }

  return { products: results, source: "mercadolibre" };
}
