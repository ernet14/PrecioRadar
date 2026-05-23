// Auditoría read-only de los productos comparables (Etapa 19 Fase 1).
// Verifica que los grupos (2+ tiendas) sean realmente el MISMO producto: lista
// cada grupo con sus ofertas (tienda, precio, título) y marca los sospechosos
// por dispersión de precio alta (posible mismatch o oferta falsa/errónea).
//   node --import tsx --env-file=.env scripts/audit-comparables.ts
import { getPrismaClient } from "../src/lib/prisma";

// Ratio max/min de precio por encima del cual el grupo se marca para revisar.
const SUSPECT_RATIO = 1.8;

type Row = { slug: string; store: string; price: number; title: string };

async function main() {
  const prisma = getPrismaClient();
  if (!prisma) { console.log("Sin DB."); return; }

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT p.slug, s.name AS store, o.price::float8 AS price, o.title
    FROM "ProductOffer" o
    JOIN "Product" p ON p.id = o."productId"
    JOIN "Store" s ON s.id = o."storeId"
    WHERE o."isDemo" = false AND o.available = true AND p."deletedAt" IS NULL AND p."isDemo" = false
      AND p.id IN (
        SELECT o2."productId" FROM "ProductOffer" o2
        JOIN "Product" p2 ON p2.id = o2."productId"
        WHERE o2."isDemo" = false AND o2.available = true AND p2."deletedAt" IS NULL AND p2."isDemo" = false
        GROUP BY o2."productId" HAVING COUNT(DISTINCT o2."storeId") >= 2
      )
    ORDER BY p.slug, o.price`;

  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    if (!groups.has(r.slug)) groups.set(r.slug, []);
    groups.get(r.slug)!.push(r);
  }

  let suspects = 0;
  const suspectSlugs: string[] = [];
  for (const [slug, offers] of groups) {
    const prices = offers.map((o) => o.price);
    const min = Math.min(...prices), max = Math.max(...prices);
    const ratio = min > 0 ? max / min : Infinity;
    const flag = ratio >= SUSPECT_RATIO ? `  ⚠️ x${ratio.toFixed(2)}` : "";
    if (flag) { suspects++; suspectSlugs.push(slug); }
    console.log(`\n${slug}${flag}`);
    for (const o of offers) {
      console.log(`   ${o.store.padEnd(10)} $${o.price.toLocaleString("es-AR").padStart(12)}  ${o.title.slice(0, 70)}`);
    }
  }

  console.log(`\n=== RESUMEN ===`);
  console.log(`Grupos comparables: ${groups.size}`);
  console.log(`Sospechosos (dispersión ≥ x${SUSPECT_RATIO}): ${suspects}`);
  if (suspectSlugs.length) console.log(suspectSlugs.join("\n"));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
