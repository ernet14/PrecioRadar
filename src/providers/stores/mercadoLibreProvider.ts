import { isMercadoLibreUrl, normalizeProductName } from "@/lib/utils";
import { getMercadoLibreToken } from "@/lib/mercadolibre/oauth";
import {
  isCircuitOpen,
  recordCircuitFailure,
  recordCircuitSuccess,
} from "@/lib/circuitBreaker";
import {
  buildCacheKey,
  getCachedResponse,
  setCachedResponse,
  type MercadoLibreEndpoint,
} from "@/services/mercadoLibreCacheService";
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

function getSiteId() {
  return process.env.MERCADOLIBRE_SITE_ID ?? defaultSiteId;
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

type RawFetchOutcome = {
  data: unknown | null;
  errorMessage?: string;
  status?: number;
  responseSnippet?: string;
};

type FetchStrategy = "public-first" | "bearer-first";

const strategyByEndpoint: Record<MercadoLibreEndpoint, FetchStrategy> = {
  // /sites/{site}/search es endpoint público; MeLi rechaza Bearer de
  // client_credentials desde IPs cloud (Vercel) con 403. Probamos sin
  // Authorization primero y solo caemos a Bearer si el anónimo falla.
  search: "public-first",
  // /items/{id} acepta token (devuelve más campos). Probamos con Bearer
  // y caemos a público si MeLi rechaza.
  items: "bearer-first",
  // /categories/{id} es público.
  categories: "public-first",
};

const errorSnippetMax = 400;

function truncateSnippet(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > errorSnippetMax
    ? `${trimmed.slice(0, errorSnippetMax - 3)}...`
    : trimmed;
}

async function rawFetch(
  path: string,
  token: string | null,
): Promise<RawFetchOutcome> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "PrecioRadar/1.0 (+https://precioradar.com.ar)",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      return {
        data: null,
        errorMessage: `HTTP ${response.status} desde MercadoLibre.`,
        responseSnippet: truncateSnippet(bodyText),
        status: response.status,
      };
    }

    return { data: await response.json(), status: response.status };
  } catch (error) {
    return {
      data: null,
      errorMessage: getProviderErrorMessage(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

const circuitName = "mercadolibre";

async function fetchMercadoLibreJson(
  path: string,
  cache: { endpoint: MercadoLibreEndpoint; identifier: string } | null,
): Promise<MercadoLibreFetchResult> {
  const cacheKey = cache ? buildCacheKey(cache.endpoint, cache.identifier) : null;

  if (cacheKey) {
    const cached = await getCachedResponse(cacheKey);
    if (cached !== null) {
      await recordProviderLog({
        action: "fetch.cacheHit",
        latencyMs: 0,
        provider: providerName,
        status: "success",
        storeSlug: "mercadolibre",
      });
      return { data: cached };
    }
  }

  if (isCircuitOpen(circuitName)) {
    await recordProviderLog({
      action: "fetch.circuitOpen",
      errorMessage: "Circuito abierto por fallos consecutivos. Sirviendo desde cache si existe.",
      provider: providerName,
      status: "skipped",
      storeSlug: "mercadolibre",
    });
    return { data: null, errorMessage: "Provider MercadoLibre temporalmente no disponible." };
  }

  const startedAt = performance.now();
  const token = await getMercadoLibreToken();
  const strategy: FetchStrategy = cache
    ? strategyByEndpoint[cache.endpoint]
    : "bearer-first";

  const order: (string | null)[] =
    strategy === "public-first"
      ? token
        ? [null, token]
        : [null]
      : token
        ? [token, null]
        : [null];

  let outcome: RawFetchOutcome | null = null;
  let attemptIndex = 0;
  let usedToken = false;
  let usedFallback = false;

  for (const attemptToken of order) {
    outcome = await rawFetch(path, attemptToken);
    const succeeded = outcome.data !== null;

    if (succeeded) {
      usedToken = attemptToken !== null;
      usedFallback = attemptIndex > 0;
      break;
    }

    const shouldRetry =
      attemptIndex < order.length - 1 &&
      (outcome.status === 401 || outcome.status === 403);

    if (!shouldRetry) {
      // Loguear el error con path + snippet del body cuando algo falla
      // de manera no recuperable o cuando aún hay reintento pendiente con
      // body informativo.
      await recordMercadoLibreFailure(
        attemptIndex === 0 && strategy === "public-first"
          ? "fetch.publicFailed"
          : attemptToken
            ? "fetch.authRejected"
            : "fetch.publicRejected",
        `HTTP ${outcome.status ?? "?"} en ${path}${
          outcome.responseSnippet ? ` — body: ${outcome.responseSnippet}` : ""
        }`,
      );
      break;
    }

    // Hay reintento: loggear este intento como warning antes de seguir.
    await recordMercadoLibreFailure(
      attemptToken ? "fetch.bearerRejected" : "fetch.publicRejected",
      `HTTP ${outcome.status ?? "?"} en ${path}${
        outcome.responseSnippet ? ` — body: ${outcome.responseSnippet}` : ""
      }. Reintentando con ${attemptToken ? "público" : "Bearer"}.`,
    );

    attemptIndex += 1;
  }

  const latencyMs = performance.now() - startedAt;
  const finalOutcome = outcome ?? {
    data: null,
    errorMessage: "MercadoLibre fetch sin intento válido.",
  };

  if (finalOutcome.data !== null && cacheKey && cache) {
    await setCachedResponse({
      body: finalOutcome.data,
      cacheKey,
      endpoint: cache.endpoint,
    });
  }

  if (finalOutcome.data !== null) {
    recordCircuitSuccess(circuitName);
    await recordProviderLog({
      action: usedFallback
        ? usedToken
          ? "fetch.bearerFallback"
          : "fetch.publicFallback"
        : usedToken
          ? "fetch.successBearer"
          : "fetch.successPublic",
      latencyMs,
      provider: providerName,
      status: "success",
      storeSlug: "mercadolibre",
    });
  } else {
    recordCircuitFailure(circuitName);
  }

  return {
    data: finalOutcome.data,
    errorMessage: finalOutcome.errorMessage,
  };
}

async function recordMercadoLibreFailure(
  action: string,
  errorMessage: string,
  latencyMs?: number,
) {
  await recordProviderLog({
    action,
    errorMessage,
    latencyMs,
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

      const siteId = getSiteId();
      const normalizedQuery = query.trim();
      const searchParams = new URLSearchParams({
        limit: String(searchLimit),
        q: normalizedQuery,
      });
      const result = await fetchMercadoLibreJson(
        `/sites/${encodeURIComponent(siteId)}/search?${searchParams.toString()}`,
        {
          endpoint: "search",
          identifier: `${siteId}:${normalizeProductName(normalizedQuery)}:${searchLimit}`,
        },
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
        { endpoint: "items", identifier: itemId },
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
        { endpoint: "items", identifier: itemId },
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
