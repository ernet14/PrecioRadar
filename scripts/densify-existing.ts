// Densificación por descubrimiento (Etapa 19 Fase 1).
//
// Por qué existe: el catálogo histórico se sembró POR TIENDA sin asegurar solape,
// así que muchos productos que SÍ existen en otras VTEX nunca se persistieron ahí
// (nadie los buscó en esas tiendas) y quedaron como "de una sola tienda" → no
// comparables. Este script toma cada producto de 1 sola tienda CON clave canónica,
// re-busca su nombre en las otras VTEX activas y persiste solo las ofertas cuya
// clave canónica COINCIDE EXACTAMENTE con la del producto (match preciso por
// EAN/SKU/phone-key, sin merges falsos). Convierte el catálogo existente en
// comparables, escalando el esfuerzo.
//
// Uso:
//   node --import tsx --env-file=.env scripts/densify-existing.ts            # dry-run
//   node --import tsx --env-file=.env scripts/densify-existing.ts --apply    # persiste
//   ...--limit 80                                                            # acota (default 40)
//
// Idempotente: persistProductOfferView hace upsert por (tienda, externalId) y slug.
import { vtexProviders } from "../src/providers/stores/vtexStores";
import { persistProductOfferView } from "../src/services/priceSnapshotService";
import { getCanonicalProductKey, slugify } from "../src/lib/utils/text";
import { getPrismaClient } from "../src/lib/prisma";
import type { ProviderProduct } from "../src/providers/stores/types";

const APPLY = process.argv.includes("--apply");
const limitArg = process.argv.find((a) => a.startsWith("--limit"));
const LIMIT = Number(limitArg?.split("=")[1] ?? process.argv[process.argv.indexOf("--limit") + 1]) || 40;

type SingleStoreProduct = { id: string; slug: string; name: string; brand: string | null; store_slug: string };

const active = vtexProviders.filter((p) => !p.blocked);

async function main() {
  const prisma = getPrismaClient();
  if (!prisma) {
    console.log("Sin DB.");
    return;
  }

  // Productos con ofertas vivas en EXACTAMENTE 1 tienda (mismo filtro que el scorecard).
  const rows = await prisma.$queryRaw<SingleStoreProduct[]>`
    SELECT p.id, p.slug, p.name, p.brand, MIN(s.slug) AS store_slug
    FROM "Product" p
    JOIN "ProductOffer" o ON o."productId" = p.id
    JOIN "Store" s ON s.id = o."storeId"
    WHERE o."isDemo" = false AND o.available = true AND p."deletedAt" IS NULL AND p."isDemo" = false
    GROUP BY p.id, p.slug, p.name, p.brand
    HAVING COUNT(DISTINCT o."storeId") = 1`;

  // Solo los que tienen clave canónica real (slug != slug-por-nombre): el resto no
  // puede matchear cross-store y gastaría búsquedas.
  const candidates = rows.filter((r) => r.slug !== slugify(r.name)).slice(0, LIMIT);

  console.log(`Productos de 1 tienda con clave canónica: ${rows.filter((r) => r.slug !== slugify(r.name)).length} (proceso ${candidates.length}, limit ${LIMIT})`);
  console.log(`Tiendas activas: ${active.map((p) => p.name).join(", ")}`);
  console.log(`Modo: ${APPLY ? "APPLY (escribe)" : "DRY-RUN (no escribe)"}\n`);

  let projectedNewComparables = 0;
  const picks: ProviderProduct[] = [];

  for (const product of candidates) {
    const missing = active.filter((p) => p.name !== product.store_slug);
    const found = await Promise.all(
      missing.map(async (provider) => {
        try {
          const results = await provider.searchProducts(product.name);
          const matches = results
            .filter((r) => r.price > 0)
            .filter((r) => getCanonicalProductKey({ name: r.name, brand: r.brand, ean: r.ean }) === product.slug)
            .sort((a, b) => a.price - b.price);
          return matches[0] ?? null;
        } catch {
          return null;
        }
      }),
    );
    const newPicks = found.filter((p): p is ProviderProduct => p !== null);
    if (newPicks.length > 0) {
      projectedNewComparables++; // pasa de 1 → 2+ tiendas
      picks.push(...newPicks);
      console.log(`✅ ${product.slug.padEnd(36)} +${newPicks.map((p) => p.storeName).join(", ")}  (estaba en ${product.store_slug})`);
    }
  }

  if (APPLY) {
    console.log(`\nPersistiendo ${picks.length} ofertas nuevas (secuencial)...`);
    let n = 0;
    for (const pick of picks) {
      await persistProductOfferView(pick);
      n++;
    }
    console.log(`Persistidas: ${n}`);
  }

  console.log(`\n=== RESUMEN ===`);
  console.log(`Productos que pasarían a comparables (1 → 2+ tiendas): ${projectedNewComparables}`);
  console.log(`Ofertas nuevas candidatas: ${picks.length}`);
  if (!APPLY) console.log(`(dry-run: nada escrito. Correr con --apply para persistir.)`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
