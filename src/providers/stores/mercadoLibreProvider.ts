import { isMercadoLibreUrl, normalizeProductName } from "@/lib/utils";
import type {
  ProviderPrice,
  ProviderPriceInput,
  ProviderProduct,
  StoreProvider,
} from "@/providers/stores/types";

type MercadoLibreConfig = {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
};

type MercadoLibreRawProduct = {
  id?: unknown;
  title?: unknown;
  price?: unknown;
  currency_id?: unknown;
  permalink?: unknown;
  thumbnail?: unknown;
  condition?: unknown;
};

const providerName = "mercadolibre";

function getMercadoLibreConfig(): MercadoLibreConfig {
  return {
    clientId: process.env.MERCADOLIBRE_CLIENT_ID,
    clientSecret: process.env.MERCADOLIBRE_CLIENT_SECRET,
    redirectUri: process.env.MERCADOLIBRE_REDIRECT_URI,
  };
}

function hasOAuthConfig(config: MercadoLibreConfig) {
  return Boolean(config.clientId && config.clientSecret && config.redirectUri);
}

function asMercadoLibreRawProduct(data: unknown): MercadoLibreRawProduct | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  return data as MercadoLibreRawProduct;
}

function normalizeCondition(condition: unknown): ProviderProduct["condition"] {
  return condition === "new" ? "NEW" : "UNKNOWN";
}

export const mercadoLibreProvider: StoreProvider = {
  name: providerName,

  async searchProducts(query: string) {
    try {
      if (!query.trim()) {
        return [];
      }

      const config = getMercadoLibreConfig();
      void hasOAuthConfig(config);

      // TODO: Connect MercadoLibre using official/public permitted endpoints.
      // Keep credentials optional for MVP and never hardcode secrets here.
      return [];
    } catch {
      return [];
    }
  },

  async getProductByUrl(url: string) {
    try {
      if (!isMercadoLibreUrl(url)) {
        return null;
      }

      const config = getMercadoLibreConfig();
      void hasOAuthConfig(config);

      // TODO: Resolve MercadoLibre item URLs through an official/permitted API.
      return null;
    } catch {
      return null;
    }
  },

  async getCurrentPrice(input: ProviderPriceInput): Promise<ProviderPrice | null> {
    try {
      if (!input.externalId && !input.url) {
        return null;
      }

      const config = getMercadoLibreConfig();
      void hasOAuthConfig(config);

      // TODO: Fetch current price from an official/permitted MercadoLibre API.
      return null;
    } catch {
      return null;
    }
  },

  normalizeProductData(data: unknown) {
    const rawProduct = asMercadoLibreRawProduct(data);

    if (
      !rawProduct ||
      typeof rawProduct.id !== "string" ||
      typeof rawProduct.title !== "string" ||
      typeof rawProduct.price !== "number" ||
      typeof rawProduct.permalink !== "string"
    ) {
      throw new TypeError(
        "mercadoLibreProvider could not normalize unsupported product data.",
      );
    }

    return {
      externalId: rawProduct.id,
      provider: providerName,
      storeSlug: "mercadolibre",
      storeName: "MercadoLibre",
      title: rawProduct.title,
      name: rawProduct.title,
      normalizedName: normalizeProductName(rawProduct.title),
      brand: null,
      model: null,
      categorySlug: null,
      imageUrl:
        typeof rawProduct.thumbnail === "string" ? rawProduct.thumbnail : null,
      productUrl: rawProduct.permalink,
      price: rawProduct.price,
      currency: rawProduct.currency_id === "ARS" ? "ARS" : "ARS",
      condition: normalizeCondition(rawProduct.condition),
      available: true,
      isDemo: false,
      lastCheckedAt: new Date(),
    };
  },
};
