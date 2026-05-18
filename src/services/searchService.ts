import { mercadoLibreProvider, mockProvider } from "@/providers/stores";
import type { ProviderProduct } from "@/providers/stores";
import {
  detectInputType,
  normalizeProductName,
  slugify,
} from "@/lib/utils";
import type {
  InputType,
  MatchType,
  ProductOffer,
  ProductWithOffers,
  Recommendation,
  SearchResult,
  SearchResultItem,
  SearchResultStatus,
  Store,
} from "@/types";

type ComingSoonCategory = {
  label: string;
  terms: string[];
};

type ScoredProviderProduct = {
  product: ProviderProduct;
  matchType: MatchType;
  matchedTokenCount: number;
  queryTokenCount: number;
  score: number;
};

const MIN_SIMILAR_SCORE = 30;

const relatedCategorySlugs: Record<string, string[]> = {
  celulares: ["celulares"],
  notebooks: ["notebooks"],
  televisores: ["televisores"],
  audio: ["audio"],
  "componentes-pc": ["componentes-pc"],
  herramientas: ["herramientas"],
  electrodomesticos: ["electrodomesticos"],
  "consolas-videojuegos": ["consolas-videojuegos"],
};

const comingSoonCategories: ComingSoonCategory[] = [
  {
    label: "Ropa, calzado y moda",
    terms: [
      "ropa",
      "zapatilla",
      "zapatillas",
      "zapato",
      "zapatos",
      "calzado",
      "remera",
      "camisa",
      "pantalon",
      "jean",
      "buzo",
      "campera",
      "vestido",
      "nike",
      "adidas",
    ],
  },
  {
    label: "Perfumeria y belleza",
    terms: ["perfume", "perfumes", "maquillaje", "crema facial", "skincare"],
  },
  {
    label: "Supermercado",
    terms: ["supermercado", "yerba", "leche", "aceite", "gaseosa"],
  },
  {
    label: "Hogar no tecnologico",
    terms: ["sillon", "colchon", "mueble", "mesa comedor", "silla gamer"],
  },
];

function createBaseResult({
  detectedType,
  exactMatches = [],
  message,
  query,
  searchedAt,
  similarMatches = [],
  status,
  usedDemoFallback,
}: {
  query: string;
  detectedType: InputType;
  exactMatches?: SearchResultItem[];
  similarMatches?: SearchResultItem[];
  status: SearchResultStatus;
  message?: string;
  usedDemoFallback: boolean;
  searchedAt: Date;
}): SearchResult {
  return {
    query,
    detectedType,
    exactMatches,
    similarMatches,
    total: exactMatches.length + similarMatches.length,
    status,
    message,
    usedDemoFallback,
    searchedAt,
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

function getComingSoonCategory(query: string) {
  const normalizedQuery = normalizeProductName(query);

  if (!normalizedQuery) {
    return null;
  }

  const queryTokens = new Set(getQueryTokens(normalizedQuery));
  const paddedQuery = ` ${normalizedQuery} `;

  return (
    comingSoonCategories.find((category) => {
      return category.terms.some((term) => {
        const normalizedTerm = normalizeProductName(term);

        if (!normalizedTerm) {
          return false;
        }

        return normalizedTerm.includes(" ")
          ? paddedQuery.includes(` ${normalizedTerm} `)
          : queryTokens.has(normalizedTerm);
      });
    }) ?? null
  );
}

function getQueryTokens(normalizedQuery: string) {
  return normalizedQuery.split(" ").filter(Boolean);
}

function getModelTokens(normalizedText: string) {
  const tokens = getQueryTokens(normalizedText);
  const modelTokens = new Set<string>();

  for (const token of tokens) {
    if (/^[a-z]+\d+[a-z0-9]*$/i.test(token) || /^[a-z]+\d+$/i.test(token)) {
      modelTokens.add(token);
    }
  }

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const currentToken = tokens[index];
    const nextToken = tokens[index + 1];

    if (/^[a-z]+$/i.test(currentToken) && /^\d+[a-z0-9]*$/i.test(nextToken)) {
      modelTokens.add(`${currentToken}${nextToken}`);
    }
  }

  return modelTokens;
}

function hasAllModelTokens({
  productText,
  queryText,
}: {
  productText: string;
  queryText: string;
}) {
  const queryModelTokens = getModelTokens(queryText);

  if (queryModelTokens.size === 0) {
    return true;
  }

  const productModelTokens = getModelTokens(productText);

  return Array.from(queryModelTokens).every((token) =>
    productModelTokens.has(token),
  );
}

function hasConflictingModelTokens({
  productText,
  queryText,
}: {
  productText: string;
  queryText: string;
}) {
  const queryModelTokens = getModelTokens(queryText);

  if (queryModelTokens.size === 0) {
    return false;
  }

  const productModelTokens = getModelTokens(productText);

  return Array.from(queryModelTokens).some(
    (token) => !productModelTokens.has(token),
  );
}

function isBrandOnlyQuery(product: ProviderProduct, queryTokens: string[]) {
  if (queryTokens.length !== 1 || !product.brand) {
    return false;
  }

  return normalizeProductName(product.brand) === queryTokens[0];
}

function inferRelevantCategorySlugs(normalizedQuery: string) {
  const tokens = getQueryTokens(normalizedQuery);
  const modelTokens = getModelTokens(normalizedQuery);
  const categories = new Set<string>();

  if (
    Array.from(modelTokens).some((token) => /^a\d{2}$/i.test(token)) ||
    tokens.some((token) =>
      ["celular", "celulares", "galaxy", "iphone", "smartphone"].includes(token),
    )
  ) {
    categories.add("celulares");
  }

  if (tokens.some((token) => ["notebook", "laptop"].includes(token))) {
    categories.add("notebooks");
  }

  if (tokens.some((token) => ["tv", "televisor", "televisores"].includes(token))) {
    categories.add("televisores");
  }

  if (tokens.some((token) => ["auricular", "auriculares", "jbl"].includes(token))) {
    categories.add("audio");
  }

  return categories;
}

function isRelatedCategory(productCategory: string, referenceCategories: Set<string>) {
  for (const referenceCategory of referenceCategories) {
    const relatedCategories = relatedCategorySlugs[referenceCategory] ?? [
      referenceCategory,
    ];

    if (relatedCategories.includes(productCategory)) {
      return true;
    }
  }

  return false;
}

function getRelatedModelMatchScore(
  product: ProviderProduct,
  queryTokens: string[],
) {
  const queryGalaxyModel = Array.from(getModelTokens(queryTokens.join(" "))).find(
    (token) => /^a\d{2}$/i.test(token),
  );

  if (!queryGalaxyModel || product.categorySlug !== "celulares") {
    return 0;
  }

  const productGalaxyModel = Array.from(getModelTokens(normalizeProductName(
    `${product.name} ${product.model ?? ""}`,
  ))).find((token) => /^a\d{2}$/i.test(token));

  if (!productGalaxyModel) {
    return 0;
  }

  return queryGalaxyModel.charAt(0) === productGalaxyModel.charAt(0) ? 30 : 0;
}

function getMercadoLibreSearchHint(url: string) {
  const parsedUrl = parseUrl(url);

  if (!parsedUrl) {
    return "";
  }

  const queryHint =
    parsedUrl.searchParams.get("q") ??
    parsedUrl.searchParams.get("search") ??
    "";
  const pathHint = parsedUrl.pathname
    .split("/")
    .join(" ")
    .replace(/[_-]+/g, " ");
  const ignoredTokens = new Set(["ar", "com", "item", "jm", "la", "mla", "p"]);

  return normalizeProductName(`${queryHint} ${pathHint}`)
    .split(" ")
    .filter((token) => token && !ignoredTokens.has(token))
    .filter((token) => !/^mla\d+$/i.test(token))
    .filter((token) => !/^\d+$/.test(token))
    .join(" ");
}

function getStoreFromProviderProduct(product: ProviderProduct): Store {
  const parsedUrl = parseUrl(product.productUrl);

  return {
    id: product.storeSlug,
    name: product.storeName,
    slug: product.storeSlug,
    baseUrl: parsedUrl ? parsedUrl.origin : product.productUrl,
    logoUrl: null,
    isDemo: product.isDemo,
    hasAffiliate: false,
    affiliateEnabled: false,
    active: true,
  };
}

function createRecommendation(
  product: ProviderProduct,
  lowestPrice: number,
): Recommendation {
  if (!product.available) {
    return {
      level: "WAIT",
      label: "Sin stock",
      reason: "La oferta no figura disponible en este momento.",
      score: 20,
      currentPrice: product.price,
      minPrice: lowestPrice,
    };
  }

  if (product.isDemo) {
    return {
      level: "INSUFFICIENT_DATA",
      label: "Sin historial verificado",
      reason:
        "Resultado de catálogo demo. Todavía no tenemos historial real para evaluar el precio.",
      score: 0,
      currentPrice: product.price,
      minPrice: lowestPrice,
    };
  }

  const isLowestPrice = product.price <= lowestPrice;

  return {
    level: "INSUFFICIENT_DATA",
    label: "Sin historial verificado",
    reason: isLowestPrice
      ? "Mejor oferta del momento. Estamos recolectando historial para validar si conviene comprar."
      : "Estamos recolectando historial para evaluar si este precio conviene.",
    score: 0,
    currentPrice: product.price,
    minPrice: lowestPrice,
  };
}

function providerProductToSearchResultItem(
  scoredProducts: ScoredProviderProduct[],
): SearchResultItem {
  const sortedProducts = [...scoredProducts].sort(
    (left, right) =>
      left.product.price - right.product.price || right.score - left.score,
  );
  const bestScoredProduct = sortedProducts[0];
  const product = bestScoredProduct.product;
  const normalizedName = product.normalizedName;
  const productSlug = product.slug ?? slugify(product.name);
  const productId = `product-${productSlug}`;
  const offers: ProductOffer[] = sortedProducts.map(({ product: offerProduct }) => {
    const store = getStoreFromProviderProduct(offerProduct);

    return {
      id: `${offerProduct.provider}-${offerProduct.externalId}-offer`,
      productId,
      storeId: store.id,
      externalId: offerProduct.externalId,
      title: offerProduct.title,
      price: offerProduct.price,
      currency: offerProduct.currency,
      productUrl: offerProduct.productUrl,
      affiliateUrl: null,
      imageUrl: offerProduct.imageUrl,
      available: offerProduct.available,
      condition: offerProduct.condition,
      isDemo: offerProduct.isDemo,
      lastCheckedAt: offerProduct.lastCheckedAt,
      store,
    };
  });
  const bestOffer = offers[0];
  const matchType: MatchType = scoredProducts.some(
    (scoredProduct) => scoredProduct.matchType === "exact",
  )
    ? "exact"
    : "similar";
  const score = Math.max(...scoredProducts.map((scoredProduct) => scoredProduct.score));
  const productWithOffers: ProductWithOffers = {
    id: productId,
    name: product.name,
    slug: productSlug,
    brand: product.brand,
    model: product.model,
    categoryId: product.categorySlug ?? "demo",
    imageUrl: product.imageUrl,
    normalizedName,
    isDemo: product.isDemo,
    offers,
    recommendation: createRecommendation(product, bestOffer.price),
  };

  return {
    product: productWithOffers,
    bestOffer,
    matchType,
    score,
  };
}

function scoreProduct(
  product: ProviderProduct,
  normalizedQuery: string,
): ScoredProviderProduct | null {
  if (!normalizedQuery) {
    return null;
  }

  const queryTokens = getQueryTokens(normalizedQuery);
  const normalizedName = normalizeProductName(product.name);
  const normalizedTitle = normalizeProductName(product.title);
  const productModelText = normalizeProductName(
    `${product.name} ${product.title} ${product.model ?? ""}`,
  );
  const searchableText = `${product.normalizedName} ${normalizedName} ${normalizedTitle}`;
  const matchedTokens = queryTokens.filter((token) =>
    searchableText.includes(token),
  );
  const hasModelConflict = hasConflictingModelTokens({
    productText: productModelText,
    queryText: normalizedQuery,
  });

  if (hasModelConflict) {
    return null;
  }

  const relatedModelScore = getRelatedModelMatchScore(product, queryTokens);

  if (matchedTokens.length === 0 && relatedModelScore === 0) {
    return null;
  }

  const allTokensMatch = matchedTokens.length === queryTokens.length;
  const directNameMatch =
    normalizedName === normalizedQuery ||
    normalizedTitle === normalizedQuery ||
    normalizedName.includes(normalizedQuery) ||
    normalizedTitle.includes(normalizedQuery);
  const modelTokensMatch = hasAllModelTokens({
    productText: productModelText,
    queryText: normalizedQuery,
  });
  const matchType: MatchType =
    modelTokensMatch &&
    !isBrandOnlyQuery(product, queryTokens) &&
    (directNameMatch || allTokensMatch)
      ? "exact"
      : "similar";
  const score =
    matchType === "exact"
      ? 100 + matchedTokens.length * 10
      : Math.max(matchedTokens.length * 10, relatedModelScore);

  return {
    matchedTokenCount: matchedTokens.length,
    product,
    queryTokenCount: queryTokens.length,
    matchType,
    score,
  };
}

function getRelevantCategorySlugs({
  exactMatches,
  normalizedQuery,
}: {
  exactMatches: SearchResultItem[];
  normalizedQuery: string;
}) {
  const categories = inferRelevantCategorySlugs(normalizedQuery);

  for (const exactMatch of exactMatches) {
    if (exactMatch.product.categoryId && exactMatch.product.categoryId !== "demo") {
      categories.add(exactMatch.product.categoryId);
    }
  }

  return categories;
}

function isRelevantSimilarMatch({
  item,
  relevantCategories,
}: {
  item: SearchResultItem;
  relevantCategories: Set<string>;
}) {
  if (item.score < MIN_SIMILAR_SCORE) {
    return false;
  }

  if (relevantCategories.size === 0) {
    return item.score >= MIN_SIMILAR_SCORE + 10;
  }

  return isRelatedCategory(item.product.categoryId, relevantCategories);
}

function splitMatches(products: ProviderProduct[], query: string) {
  const normalizedQuery = normalizeProductName(query);
  const scoredProducts = products
    .map((product) => scoreProduct(product, normalizedQuery))
    .filter((product): product is ScoredProviderProduct => Boolean(product))
    .sort(
      (left, right) =>
        right.score - left.score || left.product.price - right.product.price,
    );
  const productGroups = new Map<string, ScoredProviderProduct[]>();

  for (const scoredProduct of scoredProducts) {
    const key = scoredProduct.product.normalizedName;
    const currentGroup = productGroups.get(key) ?? [];
    currentGroup.push(scoredProduct);
    productGroups.set(key, currentGroup);
  }

  const groupedMatches = Array.from(productGroups.values())
    .map(providerProductToSearchResultItem)
    .sort(
      (left, right) =>
        right.score - left.score ||
        (left.bestOffer?.price ?? 0) - (right.bestOffer?.price ?? 0),
    );
  const exactMatches = groupedMatches.filter(
    (product) => product.matchType === "exact",
  );
  const relevantCategories = getRelevantCategorySlugs({
    exactMatches,
    normalizedQuery,
  });
  const similarMatches = groupedMatches.filter(
    (product) =>
      product.matchType === "similar" &&
      isRelevantSimilarMatch({
        item: product,
        relevantCategories,
      }),
  );

  return {
    exactMatches,
    similarMatches,
  };
}

async function searchText(query: string, searchedAt: Date) {
  const comingSoonCategory = getComingSoonCategory(query);

  if (comingSoonCategory) {
    return createBaseResult({
      query,
      detectedType: "text",
      status: "coming_soon",
      message: `Pr\u00f3ximamente vamos a sumar ${comingSoonCategory.label}. En este MVP priorizamos tecnologia, electrodomesticos y herramientas.`,
      usedDemoFallback: true,
      searchedAt,
    });
  }

  const mercadoLibreProducts = await mercadoLibreProvider.searchProducts(query);
  const mercadoLibreMatches = splitMatches(mercadoLibreProducts, query);
  const mercadoLibreTotal =
    mercadoLibreMatches.exactMatches.length +
    mercadoLibreMatches.similarMatches.length;

  if (mercadoLibreTotal > 0) {
    return createBaseResult({
      query,
      detectedType: "text",
      ...mercadoLibreMatches,
      status: "ready",
      message: "Resultados reales obtenidos desde MercadoLibre.",
      usedDemoFallback: false,
      searchedAt,
    });
  }

  const products = await mockProvider.searchProducts(query);
  const matches = splitMatches(products, query);
  const total = matches.exactMatches.length + matches.similarMatches.length;

  return createBaseResult({
    query,
    detectedType: "text",
    ...matches,
    status: "ready",
    message:
      total === 0
        ? "No encontramos resultados demo para esta busqueda."
        : "Resultados demo generados con mockProvider.",
    usedDemoFallback: true,
    searchedAt,
  });
}

async function searchGenericUrl(query: string, searchedAt: Date) {
  const mockProduct = await mockProvider.getProductByUrl(query);

  if (mockProduct) {
    const matches = splitMatches([mockProduct], mockProduct.name);

    return createBaseResult({
      query,
      detectedType: "url",
      ...matches,
      status: "ready",
      message: "URL encontrada en los datos demo.",
      usedDemoFallback: true,
      searchedAt,
    });
  }

  return createBaseResult({
    query,
    detectedType: "url",
    status: "unsupported_url",
    message:
      "Por ahora solo preparamos URLs de MercadoLibre y URLs demo conocidas.",
    usedDemoFallback: true,
    searchedAt,
  });
}

async function searchMercadoLibreUrl(query: string, searchedAt: Date) {
  const mercadoLibreProduct = await mercadoLibreProvider.getProductByUrl(query);

  if (mercadoLibreProduct) {
    const matches = splitMatches([mercadoLibreProduct], mercadoLibreProduct.name);

    return createBaseResult({
      query,
      detectedType: "mercadolibre_url",
      ...matches,
      status: "ready",
      message: "Producto resuelto desde MercadoLibreProvider.",
      usedDemoFallback: false,
      searchedAt,
    });
  }

  const mockProduct = await mockProvider.getProductByUrl(query);

  if (mockProduct) {
    const matches = splitMatches([mockProduct], mockProduct.name);

    return createBaseResult({
      query,
      detectedType: "mercadolibre_url",
      ...matches,
      status: "ready",
      message: "URL MercadoLibre demo encontrada en mockProvider.",
      usedDemoFallback: true,
      searchedAt,
    });
  }

  const fallbackQuery = getMercadoLibreSearchHint(query);
  const comingSoonCategory = fallbackQuery
    ? getComingSoonCategory(fallbackQuery)
    : null;

  if (comingSoonCategory) {
    return createBaseResult({
      query,
      detectedType: "mercadolibre_url",
      status: "coming_soon",
      message: `No pudimos resolver el link con MercadoLibre. ${comingSoonCategory.label} queda para una etapa proxima.`,
      usedDemoFallback: true,
      searchedAt,
    });
  }

  const fallbackProducts = fallbackQuery
    ? await mockProvider.searchProducts(fallbackQuery)
    : [];
  const matches = splitMatches(fallbackProducts, fallbackQuery || query);

  return createBaseResult({
    query,
    detectedType: "mercadolibre_url",
    ...matches,
    status: "mercadolibre_pending",
    message:
      "No pudimos resolver el link con MercadoLibre; se muestra fallback demo cuando el link permite inferir una busqueda.",
    usedDemoFallback: true,
    searchedAt,
  });
}

export async function searchProducts(input: string): Promise<SearchResult> {
  const query = input.trim();
  const searchedAt = new Date();

  if (!query) {
    return createBaseResult({
      query,
      detectedType: "text",
      status: "empty",
      message: "Ingresa un producto o pega un link para buscar.",
      usedDemoFallback: true,
      searchedAt,
    });
  }

  const detectedType = detectInputType(query);

  if (detectedType === "mercadolibre_url") {
    return searchMercadoLibreUrl(query, searchedAt);
  }

  if (detectedType === "url") {
    return searchGenericUrl(query, searchedAt);
  }

  return searchText(query, searchedAt);
}
