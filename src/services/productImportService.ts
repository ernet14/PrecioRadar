import { mvpCategoryDescriptors } from "@/data/categories";
import { getPrismaClient } from "@/lib/prisma";
import { normalizeProductName, slugify } from "@/lib/utils";
import {
  isAllowedImageUrl,
  isAllowedOutboundUrl,
  isAllowedSearchUrl,
} from "@/lib/utils/input";
import { fetchWithAllowedRedirects } from "@/lib/utils/safeFetch";
import { logger } from "@/lib/logger";
import type { ProductImportDraft } from "@/generated/prisma/client";

export type FieldSource = "auto" | "empty" | "manual";
export type ProductImportFieldSources = Record<string, FieldSource>;

export type ProductImportAnalysis = {
  detectedStoreName: string | null;
  detectedStoreSlug: string | null;
  fieldSources: ProductImportFieldSources;
  normalizedUrl: string | null;
  originalUrl: string;
  shortUrl: boolean;
  sourceDomain: string | null;
  suggestedCategorySlug: string | null;
  suggestedSlug: string | null;
  suggestedTitle: string | null;
  unexpandedShortUrl: boolean;
};

export type ProductImportDashboard = {
  drafts: ProductImportDraft[];
  importedTodayCount: number;
};

export type CreateImportDraftsResult =
  | { createdCount: number; status: "created" }
  | { reason: string; status: "database_unavailable" | "invalid" }
  | { status: "error" };

export type SaveImportDraftInput = {
  affiliateUrl?: string | null;
  categorySlug?: string | null;
  currentPrice?: number | null;
  externalUrl?: string | null;
  imageUrl?: string | null;
  previousPrice?: number | null;
  productName?: string | null;
  shortDescription?: string | null;
  storeName?: string | null;
  storeSlug?: string | null;
};

export type PublishImportDraftResult =
  | { productSlug: string; status: "published" }
  | { missingFields: string[]; status: "invalid" }
  | { reason: string; status: "database_unavailable" | "not_found" }
  | { status: "already_published" | "error" };

const missingDatabaseReason =
  "Falta configurar DATABASE_URL o DIRECT_URL con la conexion Postgres de Supabase.";

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "mkt_tok",
  "scid",
]);

const STORE_DEFINITIONS = [
  {
    domains: ["mercadolibre.com.ar", "mercadolibre.com", "meli.la"],
    name: "MercadoLibre",
    slug: "mercadolibre",
  },
  { domains: ["fravega.com"], name: "Fravega", slug: "fravega" },
  { domains: ["musimundo.com"], name: "Musimundo", slug: "musimundo" },
  { domains: ["carrefour.com.ar"], name: "Carrefour", slug: "carrefour" },
  { domains: ["coto.com.ar"], name: "Coto", slug: "coto" },
  { domains: ["cetrogar.com.ar"], name: "Cetrogar", slug: "cetrogar" },
  { domains: ["megatone.net"], name: "Megatone", slug: "megatone" },
  { domains: ["oncity.com"], name: "OnCity", slug: "oncity" },
  { domains: ["naldo.com.ar"], name: "Naldo", slug: "naldo" },
] as const;

const CATEGORY_KEYWORDS: Array<{ keywords: string[]; slug: string }> = [
  {
    keywords: ["celular", "smartphone", "iphone", "galaxy", "motorola", "xiaomi"],
    slug: "celulares",
  },
  {
    keywords: ["notebook", "laptop", "ideapad", "thinkpad", "macbook", "ryzen"],
    slug: "notebooks",
  },
  {
    keywords: ["geforce", "rtx", "radeon", "ssd", "procesador", "mother", "memoria"],
    slug: "componentes-pc",
  },
  {
    keywords: ["televisor", "smart tv", "smart-tv", "qled", "oled", "uhd", "pulgadas"],
    slug: "televisores",
  },
  {
    keywords: ["auricular", "parlante", "jbl", "soundbar", "audio", "bluetooth"],
    slug: "audio",
  },
  {
    keywords: ["playstation", "xbox", "nintendo", "consola", "videojuego"],
    slug: "consolas-videojuegos",
  },
  {
    keywords: ["lavarropas", "heladera", "microondas", "aire acondicionado", "drean"],
    slug: "electrodomesticos",
  },
  {
    keywords: ["taladro", "atornillador", "bosch", "dewalt", "herramienta"],
    slug: "herramientas",
  },
];
const CATEGORY_NAMES = new Map(
  mvpCategoryDescriptors.map((category) => [category.slug, category.name]),
);

function parseUrl(input: string): URL | null {
  const trimmed = input.trim();

  try {
    return new URL(trimmed);
  } catch {
    if (/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
      try {
        return new URL(`https://${trimmed}`);
      } catch {
        return null;
      }
    }

    return null;
  }
}

function normalizeImportUrl(url: URL): string {
  const copy = new URL(url.toString());
  copy.hash = "";

  for (const key of Array.from(copy.searchParams.keys())) {
    if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMS.has(key.toLowerCase())) {
      copy.searchParams.delete(key);
    }
  }

  copy.hostname = copy.hostname.toLowerCase();

  return copy.toString();
}

function detectStore(hostname: string) {
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, "");

  return (
    STORE_DEFINITIONS.find((store) =>
      store.domains.some(
        (domain) => normalizedHost === domain || normalizedHost.endsWith(`.${domain}`),
      ),
    ) ?? null
  );
}

function cleanPathSegment(segment: string): string {
  let decoded = segment;

  try {
    decoded = decodeURIComponent(segment);
  } catch {
    decoded = segment;
  }

  return decoded
    .replace(/\.(html?|aspx?)$/i, "")
    .replace(/^ML[A-Z]-?\d+-/i, "")
    .replace(/-?_JM$/i, "")
    .replace(/-\d{5,}$/i, "")
    .replace(/[_+]+/g, "-")
    .trim();
}

function getCandidateSegment(url: URL, isShortUrl: boolean): string | null {
  if (isShortUrl) return null;

  const ignored = new Set(["p", "producto", "productos", "product", "item", "articulo"]);
  const candidates = url.pathname
    .split("/")
    .map(cleanPathSegment)
    .filter(Boolean)
    .filter((segment) => !ignored.has(segment.toLowerCase()))
    .filter((segment) => /[a-záéíóúñ]/i.test(segment))
    .filter((segment) => !/^ML[A-Z]-?\d+$/i.test(segment))
    .sort((left, right) => right.length - left.length);

  return candidates[0] ?? null;
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function suggestCategorySlug(text: string): string | null {
  const normalized = normalizeProductName(text);
  const match = CATEGORY_KEYWORDS.find((category) =>
    category.keywords.some((keyword) => normalized.includes(normalizeProductName(keyword))),
  );

  return match?.slug ?? null;
}

export type PageMetadata = {
  description: string | null;
  imageUrl: string | null;
  price: string | null;
  title: string | null;
};

export type ProductImportEnrichment = {
  categorySlug: string | null;
  currentPrice: number | null;
  imageUrl: string | null;
  shortDescription: string | null;
  title: string | null;
};

export function parseImportPrice(
  raw: string | number | null | undefined,
): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }

  let value = raw.replace(/[^\d.,]/g, "");
  if (!value) return null;

  const hasComma = value.includes(",");
  const hasDot = value.includes(".");

  if (hasComma && hasDot) {
    // El ultimo separador es el decimal (formato AR: 1.299.999,00).
    value =
      value.lastIndexOf(",") > value.lastIndexOf(".")
        ? value.replace(/\./g, "").replace(",", ".")
        : value.replace(/,/g, "");
  } else if (hasComma) {
    const parts = value.split(",");
    value =
      parts.length === 2 && parts[1].length <= 2
        ? `${parts[0]}.${parts[1]}`
        : value.replace(/,/g, "");
  } else if (hasDot && value.split(".").length > 2) {
    // Multiples puntos => separadores de miles (1.299.999).
    value = value.replace(/\./g, "");
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function clampText(text: string, max: number): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? `${collapsed.slice(0, max - 1).trimEnd()}…` : collapsed;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ");
}

function readMetaTags(html: string): Map<string, string> {
  const tags = new Map<string, string>();
  const metaRegex = /<meta\b[^>]*>/gi;
  const attrRegex = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;

  for (const tag of html.match(metaRegex) ?? []) {
    const attrs: Record<string, string> = {};
    let attr: RegExpExecArray | null;
    attrRegex.lastIndex = 0;
    while ((attr = attrRegex.exec(tag))) {
      attrs[attr[1].toLowerCase()] = attr[3] ?? attr[4] ?? "";
    }

    const key = (attrs.property ?? attrs.name ?? attrs.itemprop)?.toLowerCase();
    if (key && attrs.content && !tags.has(key)) {
      tags.set(key, decodeHtmlEntities(attrs.content));
    }
  }

  return tags;
}

function findInJsonLd(node: unknown, key: "price" | "image" | "name" | "description"): string | null {
  if (!node) return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findInJsonLd(item, key);
      if (found) return found;
    }
    return null;
  }

  if (typeof node !== "object") return null;
  const record = node as Record<string, unknown>;

  if (key === "price") {
    const offers = record.offers;
    if (offers) {
      const fromOffers = findInJsonLd(offers, "price");
      if (fromOffers) return fromOffers;
    }
    const spec = record.priceSpecification;
    if (spec) {
      const fromSpec = findInJsonLd(spec, "price");
      if (fromSpec) return fromSpec;
    }
    const direct = record.price ?? record.lowPrice;
    if (typeof direct === "string" || typeof direct === "number") {
      return String(direct);
    }
  } else {
    const value = record[key];
    if (typeof value === "string" && value) return value;
    if (key === "image") {
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
      if (value && typeof value === "object") {
        const url = (value as Record<string, unknown>).url;
        if (typeof url === "string") return url;
      }
    }
  }

  // Recorre @graph u objetos anidados.
  for (const child of Object.values(record)) {
    if (child && typeof child === "object") {
      const found = findInJsonLd(child, key);
      if (found) return found;
    }
  }

  return null;
}

function readJsonLd(html: string): PageMetadata {
  const result: PageMetadata = { description: null, imageUrl: null, price: null, title: null };
  const scriptRegex =
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html))) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1].trim());
    } catch {
      continue;
    }

    result.price ??= findInJsonLd(parsed, "price");
    result.imageUrl ??= findInJsonLd(parsed, "image");
    result.title ??= findInJsonLd(parsed, "name");
    result.description ??= findInJsonLd(parsed, "description");

    if (result.price && result.imageUrl && result.title) break;
  }

  return result;
}

export function extractMetadataFromHtml(html: string): PageMetadata {
  const meta = readMetaTags(html);
  const jsonLd = readJsonLd(html);

  const price =
    jsonLd.price ??
    meta.get("product:price:amount") ??
    meta.get("og:price:amount") ??
    meta.get("price") ??
    null;
  const imageUrl = meta.get("og:image") ?? meta.get("twitter:image") ?? jsonLd.imageUrl ?? null;
  const description =
    meta.get("og:description") ?? meta.get("description") ?? jsonLd.description ?? null;
  const title = meta.get("og:title") ?? jsonLd.title ?? null;

  return {
    description: description ? clampText(description, 280) : null,
    imageUrl: imageUrl ? imageUrl.trim() : null,
    price: price ? String(price).trim() : null,
    title: title ? clampText(title, 160) : null,
  };
}

export function analyzeProductImportUrl(input: string): ProductImportAnalysis {
  const originalUrl = input.trim();
  const parsedUrl = parseUrl(originalUrl);

  if (!parsedUrl) {
    return {
      detectedStoreName: null,
      detectedStoreSlug: null,
      fieldSources: { originalUrl: "manual" },
      normalizedUrl: null,
      originalUrl,
      shortUrl: false,
      sourceDomain: null,
      suggestedCategorySlug: null,
      suggestedSlug: null,
      suggestedTitle: null,
      unexpandedShortUrl: false,
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
  const store = detectStore(hostname);
  const shortUrl = hostname === "meli.la";
  const normalizedUrl = normalizeImportUrl(parsedUrl);
  const candidateSegment = getCandidateSegment(parsedUrl, shortUrl);
  const suggestedSlug = candidateSegment ? slugify(candidateSegment) : null;
  const suggestedTitle = suggestedSlug ? titleFromSlug(suggestedSlug) : null;
  const suggestedCategorySlug = suggestedTitle ? suggestCategorySlug(suggestedTitle) : null;

  return {
    detectedStoreName: store?.name ?? null,
    detectedStoreSlug: store?.slug ?? null,
    fieldSources: {
      categorySlug: suggestedCategorySlug ? "auto" : "empty",
      externalUrl: "auto",
      normalizedUrl: "auto",
      originalUrl: "manual",
      productName: suggestedTitle ? "auto" : "empty",
      storeName: store ? "auto" : "empty",
      storeSlug: store ? "auto" : "empty",
      suggestedSlug: suggestedSlug ? "auto" : "empty",
    },
    normalizedUrl,
    originalUrl,
    shortUrl,
    sourceDomain: hostname,
    suggestedCategorySlug,
    suggestedSlug,
    suggestedTitle,
    unexpandedShortUrl: shortUrl,
  };
}

function splitLinks(rawLinks: string) {
  return rawLinks
    .split(/\r?\n/)
    .map((link) => link.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function toDecimalString(value: number | null | undefined) {
  return value === null || value === undefined ? null : value.toFixed(2);
}

function slugToName(slug: string) {
  const categoryName = CATEGORY_NAMES.get(slug);

  if (categoryName) return categoryName;

  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

function cleanAllowedUrl(
  value: string | null | undefined,
  isAllowedUrl: (url: string) => boolean,
) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return isAllowedUrl(url.toString()) ? url.toString() : null;
  } catch {
    return null;
  }
}

function getFieldSources(draft: ProductImportDraft): ProductImportFieldSources {
  if (!draft.fieldSources || typeof draft.fieldSources !== "object" || Array.isArray(draft.fieldSources)) {
    return {};
  }

  return draft.fieldSources as unknown as ProductImportFieldSources;
}

function comparableInputValue(
  key: keyof SaveImportDraftInput,
  value: SaveImportDraftInput[keyof SaveImportDraftInput],
) {
  if (value === null || value === undefined) return null;

  if (key === "currentPrice" || key === "previousPrice") {
    return typeof value === "number" ? value.toFixed(2) : null;
  }

  return String(value);
}

function comparableDraftValue(
  draft: ProductImportDraft,
  key: keyof SaveImportDraftInput,
) {
  const values: Record<keyof SaveImportDraftInput, unknown> = {
    affiliateUrl: draft.affiliateUrl,
    categorySlug: draft.categorySlug,
    currentPrice: draft.currentPrice,
    externalUrl: draft.externalUrl,
    imageUrl: draft.imageUrl,
    previousPrice: draft.previousPrice,
    productName: draft.productName,
    shortDescription: draft.shortDescription,
    storeName: draft.storeName,
    storeSlug: draft.storeSlug,
  };
  const value = values[key];

  if (value === null || value === undefined) return null;

  return String(value);
}

function markChangedSources(
  current: ProductImportFieldSources,
  draft: ProductImportDraft,
  input: SaveImportDraftInput,
) {
  const next: ProductImportFieldSources = { ...current };

  for (const key of Object.keys(input) as Array<keyof SaveImportDraftInput>) {
    const incomingValue = comparableInputValue(key, input[key]);

    if (incomingValue === null) {
      next[key] = "empty";
      continue;
    }

    next[key] =
      incomingValue === comparableDraftValue(draft, key)
        ? (current[key] ?? "manual")
        : "manual";
  }

  return next;
}

const FETCH_TIMEOUT_MS = 6000;
const MAX_HTML_BYTES = 1_500_000;
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchPageHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetchWithAllowedRedirects(url, isAllowedSearchUrl, {
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": BROWSER_USER_AGENT },
      signal: controller.signal,
    });

    if (!response) return null;
    if (!response.ok) return null;
    if (!(response.headers.get("content-type") ?? "").includes("text/html")) return null;

    return (await response.text()).slice(0, MAX_HTML_BYTES);
  } catch (error) {
    logger.warn("No se pudo leer la pagina para enriquecer el borrador.", {
      error,
      metadata: { url },
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function resolveImageUrl(image: string, base: string): string | null {
  try {
    return new URL(image, base).toString();
  } catch {
    return null;
  }
}

const emptyEnrichment: ProductImportEnrichment = {
  categorySlug: null,
  currentPrice: null,
  imageUrl: null,
  shortDescription: null,
  title: null,
};

async function enrichDraftFromPage(
  analysis: ProductImportAnalysis,
): Promise<ProductImportEnrichment> {
  const targetUrl = analysis.normalizedUrl;

  if (!targetUrl || analysis.unexpandedShortUrl || !isAllowedSearchUrl(targetUrl)) {
    return emptyEnrichment;
  }

  const html = await fetchPageHtml(targetUrl);
  if (!html) return emptyEnrichment;

  const meta = extractMetadataFromHtml(html);
  const imageUrl = meta.imageUrl ? resolveImageUrl(meta.imageUrl, targetUrl) : null;
  const categoryHint = [meta.title, meta.description].filter(Boolean).join(" ");

  return {
    categorySlug: categoryHint ? suggestCategorySlug(categoryHint) : null,
    currentPrice: parseImportPrice(meta.price),
    imageUrl,
    shortDescription: meta.description,
    title: meta.title,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
}

function buildImportDraftData(
  analysis: ProductImportAnalysis,
  enrichment: ProductImportEnrichment,
) {
  const productName = enrichment.title ?? analysis.suggestedTitle;
  const categorySlug = enrichment.categorySlug ?? analysis.suggestedCategorySlug;

  return {
    categorySlug,
    currentPrice: toDecimalString(enrichment.currentPrice),
    detectedStoreName: analysis.detectedStoreName,
    detectedStoreSlug: analysis.detectedStoreSlug,
    externalUrl: analysis.normalizedUrl,
    fieldSources: {
      ...analysis.fieldSources,
      categorySlug: categorySlug ? "auto" : "empty",
      currentPrice: enrichment.currentPrice !== null ? "auto" : "empty",
      imageUrl: enrichment.imageUrl ? "auto" : "empty",
      productName: productName ? "auto" : "empty",
      shortDescription: enrichment.shortDescription ? "auto" : "empty",
    },
    imageUrl: enrichment.imageUrl,
    normalizedUrl: analysis.normalizedUrl,
    originalUrl: analysis.originalUrl,
    productName,
    shortDescription: enrichment.shortDescription,
    shortUrl: analysis.shortUrl,
    sourceDomain: analysis.sourceDomain,
    status: "DRAFT",
    storeName: analysis.detectedStoreName,
    storeSlug: analysis.detectedStoreSlug,
    suggestedCategorySlug: analysis.suggestedCategorySlug,
    suggestedSlug: analysis.suggestedSlug,
    suggestedTitle: analysis.suggestedTitle,
    unexpandedShortUrl: analysis.unexpandedShortUrl,
  };
}

export async function createImportDraftsFromLinks(
  rawLinks: string,
): Promise<CreateImportDraftsResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", reason: missingDatabaseReason };
  }

  const links = splitLinks(rawLinks);

  if (links.length === 0) {
    return { status: "invalid", reason: "Pega al menos un link." };
  }

  try {
    const draftsData = await mapWithConcurrency(links, 5, async (link) => {
      const analysis = analyzeProductImportUrl(link);
      const enrichment = await enrichDraftFromPage(analysis);
      return buildImportDraftData(analysis, enrichment);
    });

    for (const data of draftsData) {
      await prisma.productImportDraft.create({ data });
    }

    return { status: "created", createdCount: links.length };
  } catch (error) {
    logger.error("Unable to create product import drafts.", { error });
    return { status: "error" };
  }
}

export async function getProductImportDashboard(): Promise<ProductImportDashboard> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { drafts: [], importedTodayCount: 0 };
  }

  const [drafts, importedTodayCount] = await Promise.all([
    prisma.productImportDraft.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.productImportDraft.count({
      where: { createdAt: { gte: startOfToday() } },
    }),
  ]);

  return { drafts, importedTodayCount };
}

export async function countProductImportDraftsToday(): Promise<number> {
  const prisma = getPrismaClient();

  if (!prisma) return 0;

  return prisma.productImportDraft.count({
    where: { createdAt: { gte: startOfToday() } },
  });
}

export async function saveImportDraft(
  id: string,
  input: SaveImportDraftInput,
): Promise<ProductImportDraft | null> {
  const prisma = getPrismaClient();

  if (!prisma) return null;

  const draft = await prisma.productImportDraft.findUnique({ where: { id } });

  if (!draft) return null;

  return prisma.productImportDraft.update({
    where: { id },
    data: {
      affiliateUrl: cleanAllowedUrl(input.affiliateUrl, isAllowedOutboundUrl),
      categorySlug: input.categorySlug ?? null,
      currentPrice: toDecimalString(input.currentPrice),
      externalUrl: cleanAllowedUrl(input.externalUrl, isAllowedSearchUrl),
      fieldSources: markChangedSources(getFieldSources(draft), draft, input),
      imageUrl: cleanAllowedUrl(input.imageUrl, isAllowedImageUrl),
      previousPrice: toDecimalString(input.previousPrice),
      productName: input.productName ?? null,
      shortDescription: input.shortDescription ?? null,
      storeName: input.storeName ?? null,
      storeSlug: input.storeSlug ?? null,
    },
  });
}

export async function publishImportDraft(
  id: string,
  input: SaveImportDraftInput,
): Promise<PublishImportDraftResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", reason: missingDatabaseReason };
  }

  try {
    const savedDraft = await saveImportDraft(id, input);

    if (!savedDraft) {
      return { status: "not_found", reason: "No encontramos el borrador." };
    }

    if (savedDraft.status === "PUBLISHED") {
      return { status: "already_published" };
    }

    const requiredFields: Array<[string, unknown]> = [
      ["productName", savedDraft.productName],
      ["storeSlug", savedDraft.storeSlug],
      ["categorySlug", savedDraft.categorySlug],
      ["currentPrice", savedDraft.currentPrice],
      ["externalUrl", savedDraft.externalUrl],
    ];
    const missingFields = requiredFields
      .filter(([, value]) => value === null || value === "")
      .map(([field]) => field);

    if (missingFields.length > 0) {
      return { status: "invalid", missingFields };
    }

    const productName = savedDraft.productName ?? "";
    const storeSlug = savedDraft.storeSlug ?? "";
    const categorySlug = savedDraft.categorySlug ?? "";
    const externalUrl = cleanAllowedUrl(savedDraft.externalUrl, isAllowedSearchUrl) ?? "";
    const affiliateUrl = cleanAllowedUrl(savedDraft.affiliateUrl, isAllowedOutboundUrl);
    const imageUrl = cleanAllowedUrl(savedDraft.imageUrl, isAllowedImageUrl);
    const storeName = savedDraft.storeName || slugToName(storeSlug);
    const productSlug = savedDraft.suggestedSlug || slugify(productName);
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const store = await tx.store.upsert({
        where: { slug: storeSlug },
        create: {
          active: true,
          affiliateEnabled: Boolean(affiliateUrl),
          baseUrl: getOrigin(externalUrl),
          hasAffiliate: Boolean(affiliateUrl),
          isDemo: false,
          name: storeName,
          slug: storeSlug,
        },
        update: {
          active: true,
          baseUrl: getOrigin(externalUrl),
          name: storeName,
        },
      });
      const category = await tx.category.upsert({
        where: { slug: categorySlug },
        create: {
          active: true,
          description: `Categoria creada desde importador admin: ${slugToName(categorySlug)}.`,
          featured: false,
          name: slugToName(categorySlug),
          slug: categorySlug,
        },
        update: { active: true },
      });
      const product = await tx.product.upsert({
        where: { slug: productSlug },
        create: {
          brand: null,
          categoryId: category.id,
          imageUrl,
          isDemo: false,
          model: null,
          name: productName,
          normalizedName: normalizeProductName(productName),
          slug: productSlug,
        },
        update: {
          categoryId: category.id,
          imageUrl,
          name: productName,
          normalizedName: normalizeProductName(productName),
        },
      });
      const offer = await tx.productOffer.upsert({
        where: {
          storeId_externalId: {
            externalId: `admin-import-${savedDraft.id}`,
            storeId: store.id,
          },
        },
        create: {
          affiliateUrl,
          available: true,
          condition: "NEW",
          currency: "ARS",
          externalId: `admin-import-${savedDraft.id}`,
          imageUrl,
          isDemo: false,
          lastCheckedAt: now,
          price: savedDraft.currentPrice ?? "0",
          productId: product.id,
          productUrl: externalUrl,
          storeId: store.id,
          title: productName,
        },
        update: {
          affiliateUrl,
          available: true,
          imageUrl,
          lastCheckedAt: now,
          price: savedDraft.currentPrice ?? "0",
          productId: product.id,
          productUrl: externalUrl,
          title: productName,
        },
      });

      await tx.priceHistory.create({
        data: {
          currency: "ARS",
          isDemo: false,
          offerId: offer.id,
          price: savedDraft.currentPrice ?? "0",
          productId: product.id,
          recordedAt: now,
          source: "admin-import",
          storeId: store.id,
        },
      });

      await tx.productImportDraft.update({
        where: { id: savedDraft.id },
        data: {
          publishedAt: now,
          publishedOfferId: offer.id,
          publishedProductId: product.id,
          status: "PUBLISHED",
        },
      });

      return { productSlug: product.slug };
    });

    return { status: "published", productSlug: result.productSlug };
  } catch (error) {
    logger.error("Unable to publish product import draft.", { error });
    return { status: "error" };
  }
}
