// Índice de precios (Etapa 19 — Fase 3, capa de datos).
//
// Calcula un índice tipo "matched-model" encadenado (elemental Jevons), la misma
// familia que usan los IPC para agregados elementales: en vez de promediar precios
// absolutos (sesgado cuando la canasta cambia de productos), encadena la media
// geométrica de los *relativos* de precio (precio_t / precio_{t-1}) sobre los
// productos presentes en ambos días. Así la entrada/salida de productos no produce
// saltos espurios y el índice compone con el tiempo igual que `PriceHistory`.
//
// Precio representativo por producto/día = mediana de los precios registrados ese
// día entre las tiendas (robusto a outliers y a una sola tienda con promo puntual).
//
// Honesto por diseño: con pocos días el índice es casi plano; gana sentido a medida
// que el cron diario acumula serie. `days`/`productsTracked` exponen la madurez.
import { getPrismaClient } from "@/lib/prisma";
import { normalizeCategorySlug } from "@/data/categories";

export type PriceIndexPoint = {
  date: string; // YYYY-MM-DD
  index: number; // base 100 en el primer día con datos
  sampleSize: number; // productos emparejados contra el día previo
};

export type PriceIndexResult = {
  points: PriceIndexPoint[];
  baseDate: string | null;
  latestDate: string | null;
  latestIndex: number | null;
  totalChangePct: number | null; // variación acumulada desde la base
  productsTracked: number; // productos distintos que aportaron algún dato
  days: number;
};

export type PriceIndexSourceRow = {
  category_slug: string;
  median_price: unknown;
  product_id: string;
  product_name: string;
  day: Date;
};

export type PriceIndexBatchResult = {
  rowsRead: number;
  scopes: Array<{ categorySlug: string | null; index: PriceIndexResult }>;
  truncated: boolean;
};

// Tope de egress por consulta. Conserva hoy la serie completa (~84k filas
// agregadas) pero impide crecimiento sin límite.
export const MAX_PRICE_INDEX_ROWS = 90_000;
export const MAX_PRICE_INDEX_SCOPES = 16;

function toDayKey(day: Date): string {
  return new Date(day).toISOString().split("T")[0];
}

const EMPTY: PriceIndexResult = {
  points: [],
  baseDate: null,
  latestDate: null,
  latestIndex: null,
  totalChangePct: null,
  productsTracked: 0,
  days: 0,
};

function buildPriceIndex(
  rows: PriceIndexSourceRow[],
  categorySlug: string | null,
): PriceIndexResult {
  const filteredRows = categorySlug
    ? rows.filter((row) =>
        normalizeCategorySlug({ name: row.product_name, slug: row.category_slug }) === categorySlug,
      )
    : rows;

  if (filteredRows.length === 0) return EMPTY;

  // day -> (productId -> precio mediano)
  const byDay = new Map<string, Map<string, number>>();
  const products = new Set<string>();
  for (const row of filteredRows) {
    const price = Number(row.median_price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const key = toDayKey(row.day);
    if (!byDay.has(key)) byDay.set(key, new Map());
    byDay.get(key)!.set(row.product_id, price);
    products.add(row.product_id);
  }

  const days = [...byDay.keys()].sort();
  if (days.length === 0) return EMPTY;

  // Índice encadenado Jevons: index_0 = 100; index_t = index_{t-1} * GM(ratios).
  const points: PriceIndexPoint[] = [
    { date: days[0], index: 100, sampleSize: byDay.get(days[0])!.size },
  ];

  for (let i = 1; i < days.length; i++) {
    const prev = byDay.get(days[i - 1])!;
    const curr = byDay.get(days[i])!;
    let logSum = 0;
    let matched = 0;
    for (const [productId, price] of curr) {
      const prevPrice = prev.get(productId);
      if (prevPrice && prevPrice > 0) {
        logSum += Math.log(price / prevPrice);
        matched++;
      }
    }
    const geoMean = matched > 0 ? Math.exp(logSum / matched) : 1;
    const prevIndex = points[i - 1].index;
    points.push({
      date: days[i],
      index: Math.round(prevIndex * geoMean * 100) / 100,
      sampleSize: matched,
    });
  }

  const latest = points[points.length - 1];
  return {
    points,
    baseDate: points[0].date,
    latestDate: latest.date,
    latestIndex: latest.index,
    totalChangePct: Math.round((latest.index - 100) * 100) / 100,
    productsTracked: products.size,
    days: days.length,
  };
}

export async function computePriceIndexes(
  categorySlugs: ReadonlyArray<string | null>,
  loadRows?: () => Promise<PriceIndexSourceRow[]>,
): Promise<PriceIndexBatchResult> {
  const requestedScopes = Array.from(new Set(categorySlugs)).slice(0, MAX_PRICE_INDEX_SCOPES);
  const prisma = loadRows ? null : getPrismaClient();

  if (!loadRows && !prisma) {
    return {
      rowsRead: 0,
      scopes: requestedScopes.map((categorySlug) => ({ categorySlug, index: EMPTY })),
      truncated: false,
    };
  }

  try {
    // Una sola lectura sirve a todos los scopes. Antes cada categoría repetía
    // esta consulta completa y el filtrado ocurría recién en JavaScript.
    const loadedRows = loadRows
      ? await loadRows()
      : await prisma!.$queryRaw<PriceIndexSourceRow[]>`
      SELECT ph."productId" AS product_id,
             pr.name AS product_name,
             c.slug AS category_slug,
             DATE(ph."recordedAt") AS day,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY ph.price) AS median_price
      FROM "PriceHistory" ph
      JOIN "Product" pr ON pr.id = ph."productId"
      JOIN "Category" c ON c.id = pr."categoryId"
      JOIN "Store" s ON s.id = ph."storeId"
      WHERE ph."isDemo" = false
        AND pr."deletedAt" IS NULL
        AND pr."isDemo" = false
        AND s."deletedAt" IS NULL
        AND s."isDemo" = false
        AND s.active = true
      GROUP BY ph."productId", pr.name, c.slug, DATE(ph."recordedAt")
      ORDER BY day DESC, product_id ASC
      LIMIT ${MAX_PRICE_INDEX_ROWS}`;
    const rows = loadedRows.slice(0, MAX_PRICE_INDEX_ROWS);

    return {
      rowsRead: rows.length,
      scopes: requestedScopes.map((categorySlug) => ({
        categorySlug,
        index: buildPriceIndex(rows, categorySlug),
      })),
      truncated: loadedRows.length >= MAX_PRICE_INDEX_ROWS,
    };
  } catch {
    return {
      rowsRead: 0,
      scopes: requestedScopes.map((categorySlug) => ({ categorySlug, index: EMPTY })),
      truncated: false,
    };
  }
}

export async function computePriceIndex(opts?: {
  categorySlug?: string | null;
}): Promise<PriceIndexResult> {
  const categorySlug = opts?.categorySlug ?? null;
  const batch = await computePriceIndexes([categorySlug]);
  return batch.scopes[0]?.index ?? EMPTY;
}
