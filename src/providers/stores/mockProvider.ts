import { mockStoreProducts } from "@/data/mockStoreProducts";
import { normalizeProductName } from "@/lib/utils";
import type {
  ProviderPrice,
  ProviderPriceInput,
  ProviderProduct,
  StoreProvider,
} from "@/providers/stores/types";

function isProviderProduct(data: unknown): data is ProviderProduct {
  if (!data || typeof data !== "object") {
    return false;
  }

  const candidate = data as Partial<ProviderProduct>;

  return (
    typeof candidate.externalId === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.productUrl === "string" &&
    typeof candidate.price === "number"
  );
}

function toProviderPrice(product: ProviderProduct): ProviderPrice {
  return {
    externalId: product.externalId,
    price: product.price,
    currency: product.currency,
    available: product.available,
    isDemo: product.isDemo,
    lastCheckedAt: product.lastCheckedAt,
  };
}

function scoreProduct(product: ProviderProduct, normalizedQuery: string) {
  const normalizedTitle = normalizeProductName(product.title);
  const searchableText = `${product.normalizedName} ${normalizedTitle}`;

  if (product.normalizedName === normalizedQuery) {
    return 100;
  }

  if (product.normalizedName.includes(normalizedQuery)) {
    return 80;
  }

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const matchedTokens = queryTokens.filter((token) =>
    searchableText.includes(token),
  );
  const queryGalaxyModel = queryTokens.find((token) => /^a\d{2}$/i.test(token));
  const productGalaxyModel = normalizeProductName(
    `${product.name} ${product.model ?? ""}`,
  )
    .split(" ")
    .find((token) => /^a\d{2}$/i.test(token));

  if (
    queryGalaxyModel &&
    productGalaxyModel &&
    product.categorySlug === "celulares" &&
    queryGalaxyModel.charAt(0) === productGalaxyModel.charAt(0)
  ) {
    return Math.max(matchedTokens.length * 10, 30);
  }

  return matchedTokens.length * 10;
}

export const mockProvider: StoreProvider = {
  name: "mock",

  async searchProducts(query: string) {
    const normalizedQuery = normalizeProductName(query);

    if (!normalizedQuery) {
      return [];
    }

    return mockStoreProducts
      .map((product) => ({
        product,
        score: scoreProduct(product, normalizedQuery),
      }))
      .filter((result) => result.score > 0)
      .sort((left, right) => right.score - left.score || left.product.price - right.product.price)
      .map((result) => result.product);
  },

  async getProductByUrl(url: string) {
    return (
      mockStoreProducts.find(
        (product) => product.productUrl.toLowerCase() === url.trim().toLowerCase(),
      ) ?? null
    );
  },

  async getCurrentPrice(input: ProviderPriceInput) {
    const product =
      mockStoreProducts.find((item) => item.externalId === input.externalId) ??
      mockStoreProducts.find((item) => item.productUrl === input.url);

    return product ? toProviderPrice(product) : null;
  },

  normalizeProductData(data: unknown) {
    if (!isProviderProduct(data)) {
      throw new TypeError("mockProvider expected normalized ProviderProduct data.");
    }

    return {
      ...data,
      normalizedName: normalizeProductName(data.name),
    };
  },
};
