import { normalizeProductName, slugify } from "@/lib/utils";
import {
  isCircuitOpen,
  recordCircuitFailure,
  recordCircuitSuccess,
} from "@/lib/circuitBreaker";
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

// Muchos retailers argentinos (Frávega, Cetrogar, Naldo, OnCity, Easy, Coppel,
// Carrefour, Jumbo, ...) corren sobre VTEX y exponen la Search API pública de
// catálogo (`/api/catalog_system/pub/...`), la misma que usa su frontend.
// No es scraping de HTML: es una API JSON pública de VTEX. Este factory crea un
// StoreProvider por tienda compartiendo toda la lógica.

export type VtexStoreConfig = {
  name: string;
  storeSlug: string;
  storeName: string;
  baseUrl: string;
  // Marca la tienda como bloqueada (p. ej. 403 persistente): no se hacen
  // requests y el cron/búsqueda la saltean sin reintentar.
  blocked?: boolean;
};

const requestTimeoutMs = 6000;
const searchLimit = 12;

type VtexCommertialOffer = {
  Price?: unknown;
  ListPrice?: unknown;
  IsAvailable?: unknown;
  AvailableQuantity?: unknown;
};

type VtexSeller = { commertialOffer?: VtexCommertialOffer };

type VtexItem = {
  itemId?: unknown;
  ean?: unknown;
  referenceId?: { Value?: unknown }[];
  images?: { imageUrl?: unknown }[];
  sellers?: VtexSeller[];
};

type VtexProduct = {
  productId?: unknown;
  productName?: unknown;
  brand?: unknown;
  link?: unknown;
  linkText?: unknown;
  categories?: unknown;
  items?: VtexItem[];
};

function asVtexProduct(data: unknown): VtexProduct | null {
  if (!data || typeof data !== "object") return null;
  return data as VtexProduct;
}

function getBestOffer(product: VtexProduct): { price: number; available: boolean } | null {
  const offer = product.items?.[0]?.sellers?.[0]?.commertialOffer;
  if (!offer || typeof offer.Price !== "number" || !Number.isFinite(offer.Price) || offer.Price <= 0) {
    return null;
  }
  // VTEX solo devuelve en la búsqueda productos listados y con precio, así que
  // un Price > 0 ya implica que el producto se puede comprar. NO usamos
  // IsAvailable/AvailableQuantity como condición de stock porque VTEX los
  // calcula según la región del que consulta: desde un datacenter fuera de
  // Argentina (p. ej. el server de Vercel en US) devuelven false/0 aunque el
  // producto esté disponible en AR, lo que marcaba todo como "sin stock".
  return { price: offer.Price, available: true };
}

function getImageUrl(product: VtexProduct): string | null {
  const image = product.items?.[0]?.images?.[0]?.imageUrl;
  return typeof image === "string" ? image : null;
}

// VTEX expone el código de barras en items[].ean (a veces vacío o "0"). Lo
// devolvemos crudo; la normalización/validación vive en normalizeEan.
function getEan(product: VtexProduct): string | null {
  const ean = product.items?.[0]?.ean;
  return typeof ean === "string" && ean.trim() ? ean.trim() : null;
}

function getCategorySlug(product: VtexProduct): string | null {
  if (!Array.isArray(product.categories) || product.categories.length === 0) return null;
  const first = product.categories[0];
  if (typeof first !== "string") return null;
  // VTEX entrega "/Celulares/Accesorios.../" — usamos el primer segmento.
  const segment = first.split("/").filter(Boolean)[0];
  return segment ? slugify(segment) : null;
}

function extractProductId(url: string): string | null {
  // VTEX product URL: .../slug-{productId}/p
  const match = url.match(/-(\d{4,})\/p(?:$|[/?#])/i);
  return match ? match[1] : null;
}

function shouldOpenCircuitForVtexFailure(status: number | undefined, errorMessage: string | undefined) {
  if (typeof status !== "number") return true;
  if (status < 400 || status >= 500) return true;

  return status === 400 && /scripts are not allowed/i.test(errorMessage ?? "");
}

export function createVtexProvider(config: VtexStoreConfig): StoreProvider {
  const { name, storeSlug, storeName, baseUrl, blocked = false } = config;
  const circuitName = `vtex:${storeSlug}`;
  const hostPattern = new RegExp(
    baseUrl.replace(/^https?:\/\//, "").replace(/\./g, "\\."),
    "i",
  );

  async function fetchVtex(path: string): Promise<{
    data: unknown | null;
    errorMessage?: string;
    status?: number;
  }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "PrecioRadar/1.0 (+https://www.precio-radar.com)",
        },
        signal: controller.signal,
      });
      // VTEX search responde 206 (Partial Content) en éxito por el rango _from/_to.
      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        return {
          data: null,
          errorMessage: `HTTP ${response.status} desde ${storeName}.${
            bodyText ? ` ${bodyText.slice(0, 160)}` : ""
          }`,
          status: response.status,
        };
      }
      return { data: await response.json(), status: response.status };
    } catch (error) {
      return { data: null, errorMessage: getProviderErrorMessage(error) };
    } finally {
      clearTimeout(timeout);
    }
  }

  async function recordFailure(action: string, errorMessage: string) {
    await recordProviderLog({ action, errorMessage, provider: name, status: "failed", storeSlug });
  }

  const provider: StoreProvider = {
    name,
    blocked,

    async searchProducts(query: string) {
      if (blocked) return [];
      const normalizedQuery = query.trim();
      if (!normalizedQuery) return [];

      if (isCircuitOpen(circuitName)) {
        await recordProviderLog({
          action: "fetch.circuitOpen",
          errorMessage: `Circuito ${storeName} abierto por fallos consecutivos.`,
          provider: name,
          status: "skipped",
          storeSlug,
        });
        return [];
      }

      const startedAt = performance.now();
      const path = `/api/catalog_system/pub/products/search/${encodeURIComponent(
        normalizedQuery,
      )}?_from=0&_to=${searchLimit - 1}`;
      const result = await fetchVtex(path);
      const latencyMs = performance.now() - startedAt;

      if (result.errorMessage || result.data === null) {
        // La mayoria de 4xx son permanentes, pero VTEX usa 400 "Scripts are
        // not allowed" como bloqueo anti-automatizacion. En ese caso abrimos
        // circuito para no seguir golpeando todas las tiendas y llenar logs.
        if (shouldOpenCircuitForVtexFailure(result.status, result.errorMessage)) {
          recordCircuitFailure(circuitName);
        }
        await recordFailure("searchProducts", result.errorMessage ?? "Sin datos.");
        return [];
      }

      recordCircuitSuccess(circuitName);

      if (!Array.isArray(result.data)) {
        await recordFailure("searchProducts", `${storeName} devolvió una respuesta inválida.`);
        return [];
      }

      const products: ProviderProduct[] = [];
      let invalid = 0;
      for (const item of result.data) {
        try {
          products.push(provider.normalizeProductData(item));
        } catch {
          invalid += 1;
        }
      }

      await recordProviderLog({
        action: invalid > 0 ? "searchProducts.partial" : "searchProducts",
        errorMessage: invalid > 0 ? `${invalid} resultados no se pudieron normalizar.` : undefined,
        latencyMs,
        provider: name,
        status: "success",
        storeSlug,
      });

      return products;
    },

    async getProductByUrl(url: string) {
      if (blocked) return null;
      try {
        if (!hostPattern.test(url)) return null;
        const productId = extractProductId(url);
        if (!productId) {
          await recordFailure("getProductByUrl", "No se pudo extraer productId del link.");
          return null;
        }
        const result = await fetchVtex(
          `/api/catalog_system/pub/products/search?fq=productId:${encodeURIComponent(productId)}`,
        );
        if (result.errorMessage || !Array.isArray(result.data) || result.data.length === 0) {
          if (result.errorMessage) await recordFailure("getProductByUrl", result.errorMessage);
          return null;
        }
        return provider.normalizeProductData(result.data[0]);
      } catch (error) {
        await recordFailure("getProductByUrl", getProviderErrorMessage(error));
        return null;
      }
    },

    async getCurrentPrice(input: ProviderPriceInput): Promise<ProviderPrice | null> {
      if (blocked) return null;
      try {
        const productId = input.externalId ?? (input.url ? extractProductId(input.url) : null);
        if (!productId) return null;
        const result = await fetchVtex(
          `/api/catalog_system/pub/products/search?fq=productId:${encodeURIComponent(productId)}`,
        );
        if (result.errorMessage || !Array.isArray(result.data) || result.data.length === 0) {
          if (result.errorMessage) await recordFailure("getCurrentPrice", result.errorMessage);
          return null;
        }
        const product = provider.normalizeProductData(result.data[0]);
        return {
          externalId: product.externalId,
          price: product.price,
          currency: product.currency,
          available: product.available,
          isDemo: product.isDemo,
          lastCheckedAt: product.lastCheckedAt,
        };
      } catch (error) {
        await recordFailure("getCurrentPrice", getProviderErrorMessage(error));
        return null;
      }
    },

    normalizeProductData(data: unknown) {
      const product = asVtexProduct(data);
      const offer = product ? getBestOffer(product) : null;

      if (
        !product ||
        typeof product.productId !== "string" ||
        typeof product.productName !== "string" ||
        typeof product.link !== "string" ||
        !offer
      ) {
        throw new TypeError(`${name} no pudo normalizar el producto VTEX.`);
      }

      return {
        externalId: product.productId,
        provider: name,
        storeSlug,
        storeName,
        title: product.productName,
        name: product.productName,
        normalizedName: normalizeProductName(product.productName),
        brand: typeof product.brand === "string" ? product.brand : null,
        model: null,
        ean: getEan(product),
        categorySlug: getCategorySlug(product),
        imageUrl: getImageUrl(product),
        productUrl: product.link,
        price: offer.price,
        currency: "ARS" as const,
        condition: "NEW" as const,
        available: offer.available,
        isDemo: false,
        lastCheckedAt: new Date(),
      };
    },
  };

  return provider;
}
