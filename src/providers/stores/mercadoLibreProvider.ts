import { isMercadoLibreUrl, normalizeProductName } from "@/lib/utils";
import type {
  ProviderPrice,
  ProviderPriceInput,
  ProviderProduct,
  StoreProvider,
} from "@/providers/stores/types";
import {
  getProviderErrorMessage,
  recordProviderLog,
} from "@/services/providerLogService";

type MercadoLibreConfig = {
  accessToken?: string;
  siteId: string;
};

type MercadoLibreRawProduct = {
  attributes?: unknown;
  available_quantity?: unknown;
  category_id?: unknown;
  id?: unknown;
  title?: unknown;
  price?: unknown;
  currency_id?: unknown;
  permalink?: unknown;
  thumbnail?: unknown;
  condition?: unknown;
  status?: unknown;
};

type MercadoLibreSearchResponse = {
  results?: unknown;
};

type MercadoLibreFetchResult = {
  data: unknown | null;
  errorMessage?: string;
};

const providerName = "mercadolibre";
const apiBaseUrl = "https://api.mercadolibre.com";
const defaultSiteId = "MLA";
const requestTimeoutMs = 5000;
const searchLimit = 10;

function getMercadoLibreConfig(): MercadoLibreConfig {
  return {
    accessToken: process.env.MERCADOLIBRE_ACCESS_TOKEN,
    siteId: process.env.MERCADOLIBRE_SITE_ID ?? defaultSiteId,
  };
}

function parseUrl(input: string) {
  const trimmedInput = input.trim();

  try {
    return new URL(trimmedInput);
  } catch {
    try {
      return new URL(`https://${trimmedInput}`);
    } catch {
      return null;
    }
  }
}

function asMercadoLibreRawProduct(data: unknown): MercadoLibreRawProduct | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  return data as MercadoLibreRawProduct;
}

function asMercadoLibreSearchResponse(
  data: unknown,
): MercadoLibreSearchResponse | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  return data as MercadoLibreSearchResponse;
}

function getAttributeValue(attributes: unknown, id: string) {
  if (!Array.isArray(attributes)) {
    return null;
  }

  for (const attribute of attributes) {
    if (!attribute || typeof attribute !== "object") {
      continue;
    }

    const candidate = attribute as { id?: unknown; value_name?: unknown };

    if (candidate.id === id && typeof candidate.value_name === "string") {
      return candidate.value_name;
    }
  }

  return null;
}

function getHeaders(config: MercadoLibreConfig) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (config.accessToken) {
    headers.Authorization = `Bearer ${config.accessToken}`;
  }

  return headers;
}

async function fetchMercadoLibreJson(
  path: string,
  config: MercadoLibreConfig,
): Promise<MercadoLibreFetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: getHeaders(config),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        data: null,
        errorMessage: `HTTP ${response.status} desde MercadoLibre.`,
      };
    }

    return { data: await response.json() };
  } catch (error) {
    return {
      data: null,
      errorMessage: getProviderErrorMessage(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function recordMercadoLibreFailure(action: string, errorMessage: string) {
  await recordProviderLog({
    action,
    errorMessage,
    provider: providerName,
    status: "failed",
    storeSlug: "mercadolibre",
  });
}

function normalizeCondition(condition: unknown): ProviderProduct["condition"] {
  if (condition === "new") {
    return "NEW";
  }

  if (condition === "used") {
    return "USED";
  }

  if (condition === "reconditioned") {
    return "REFURBISHED";
  }

  return "UNKNOWN";
}

function normalizeItemId(prefix: string, digits: string) {
  return `${prefix.toUpperCase()}${digits}`;
}

function extractMercadoLibreItemId(url: string) {
  if (!isMercadoLibreUrl(url)) {
    return null;
  }

  const parsedUrl = parseUrl(url);

  if (!parsedUrl) {
    return null;
  }

  const queryItemId =
    parsedUrl.searchParams.get("item_id") ??
    parsedUrl.searchParams.get("item") ??
    "";
  const queryMatch = queryItemId.match(/^(ML[A-Z])-?(\d+)$/i);

  if (queryMatch) {
    return normalizeItemId(queryMatch[1], queryMatch[2]);
  }

  const pathMatch = parsedUrl.pathname.match(
    /(?:^|[/-])(ML[A-Z])-?(\d{6,})(?=$|[^\d])/i,
  );

  return pathMatch ? normalizeItemId(pathMatch[1], pathMatch[2]) : null;
}

function isAvailable(rawProduct: MercadoLibreRawProduct) {
  if (rawProduct.status === "closed" || rawProduct.status === "inactive") {
    return false;
  }

  if (typeof rawProduct.available_quantity === "number") {
    return rawProduct.available_quantity > 0;
  }

  return true;
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

export const mercadoLibreProvider: StoreProvider = {
  name: providerName,

  async searchProducts(query: string) {
    try {
      if (!query.trim()) {
        return [];
      }

      const config = getMercadoLibreConfig();
      const searchParams = new URLSearchParams({
        limit: String(searchLimit),
        q: query.trim(),
      });
      const result = await fetchMercadoLibreJson(
        `/sites/${encodeURIComponent(config.siteId)}/search?${searchParams.toString()}`,
        config,
      );

      if (result.errorMessage) {
        await recordMercadoLibreFailure("searchProducts", result.errorMessage);
        return [];
      }

      const searchResponse = asMercadoLibreSearchResponse(result.data);

      if (!searchResponse || !Array.isArray(searchResponse.results)) {
        await recordMercadoLibreFailure(
          "searchProducts",
          "MercadoLibre devolvio una respuesta de busqueda invalida.",
        );
        return [];
      }

      const products: ProviderProduct[] = [];
      let invalidResults = 0;

      for (const item of searchResponse.results) {
        try {
          products.push(this.normalizeProductData(item));
        } catch {
          invalidResults += 1;
        }
      }

      if (invalidResults > 0) {
        await recordMercadoLibreFailure(
          "searchProducts",
          `${invalidResults} resultados de MercadoLibre no se pudieron normalizar.`,
        );
      }

      return products;
    } catch (error) {
      await recordMercadoLibreFailure(
        "searchProducts",
        getProviderErrorMessage(error),
      );
      return [];
    }
  },

  async getProductByUrl(url: string) {
    try {
      if (!isMercadoLibreUrl(url)) {
        return null;
      }

      const config = getMercadoLibreConfig();
      const itemId = extractMercadoLibreItemId(url);

      if (!itemId) {
        await recordMercadoLibreFailure(
          "getProductByUrl",
          "No se pudo extraer item id del link de MercadoLibre.",
        );
        return null;
      }

      const result = await fetchMercadoLibreJson(
        `/items/${encodeURIComponent(itemId)}`,
        config,
      );

      if (result.errorMessage) {
        await recordMercadoLibreFailure("getProductByUrl", result.errorMessage);
        return null;
      }

      return result.data ? this.normalizeProductData(result.data) : null;
    } catch (error) {
      await recordMercadoLibreFailure(
        "getProductByUrl",
        getProviderErrorMessage(error),
      );
      return null;
    }
  },

  async getCurrentPrice(input: ProviderPriceInput): Promise<ProviderPrice | null> {
    try {
      if (!input.externalId && !input.url) {
        return null;
      }

      const config = getMercadoLibreConfig();
      const itemId =
        input.externalId ??
        (input.url ? extractMercadoLibreItemId(input.url) : null);

      if (!itemId) {
        await recordMercadoLibreFailure(
          "getCurrentPrice",
          "No se pudo resolver item id para consultar precio actual.",
        );
        return null;
      }

      const result = await fetchMercadoLibreJson(
        `/items/${encodeURIComponent(itemId)}`,
        config,
      );

      if (result.errorMessage) {
        await recordMercadoLibreFailure("getCurrentPrice", result.errorMessage);
        return null;
      }

      return result.data ? toProviderPrice(this.normalizeProductData(result.data)) : null;
    } catch (error) {
      await recordMercadoLibreFailure(
        "getCurrentPrice",
        getProviderErrorMessage(error),
      );
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
      !Number.isFinite(rawProduct.price) ||
      typeof rawProduct.permalink !== "string"
    ) {
      throw new TypeError(
        "mercadoLibreProvider could not normalize unsupported product data.",
      );
    }

    const brand = getAttributeValue(rawProduct.attributes, "BRAND");
    const model = getAttributeValue(rawProduct.attributes, "MODEL");

    return {
      externalId: rawProduct.id,
      provider: providerName,
      storeSlug: "mercadolibre",
      storeName: "MercadoLibre",
      title: rawProduct.title,
      name: rawProduct.title,
      normalizedName: normalizeProductName(rawProduct.title),
      brand,
      model,
      categorySlug:
        typeof rawProduct.category_id === "string"
          ? rawProduct.category_id
          : null,
      imageUrl:
        typeof rawProduct.thumbnail === "string" ? rawProduct.thumbnail : null,
      productUrl: rawProduct.permalink,
      price: rawProduct.price,
      currency: rawProduct.currency_id === "ARS" ? "ARS" : "ARS",
      condition: normalizeCondition(rawProduct.condition),
      available: isAvailable(rawProduct),
      isDemo: false,
      lastCheckedAt: new Date(),
    };
  },
};
