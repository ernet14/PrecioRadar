// Marca no disponibles las ofertas con precio implausible (Etapa 19 Fase 1,
// limpieza pre-SEO). Algunos feeds VTEX (Jumbo/Vea/OnCity) devuelven precios rotos
// (p.ej. un Redmi Note 13 a $2.016) que quedarían ridículos en una página pública.
//   node --import tsx --env-file=.env scripts/fix-junk-prices.ts            # dry-run
//   node --import tsx --env-file=.env scripts/fix-junk-prices.ts --apply    # marca
import { getPrismaClient } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const floorArg = process.argv.find((a) => a.startsWith("--floor"));
const FLOOR = Number(floorArg?.split("=")[1] ?? process.argv[process.argv.indexOf("--floor") + 1]) || 10000;

type Row = { id: string; slug: string; store: string; price: number; title: string };

async function main() {
  const prisma = getPrismaClient();
  if (!prisma) { console.log("Sin DB."); return; }

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT o.id, p.slug, s.name AS store, o.price::float8 AS price, o.title
    FROM "ProductOffer" o JOIN "Product" p ON p.id=o."productId" JOIN "Store" s ON s.id=o."storeId"
    WHERE o."isDemo"=false AND o.available=true AND p."deletedAt" IS NULL AND p."isDemo"=false
      AND o.price < ${FLOOR}
    ORDER BY o.price`;

  // Un precio < $10k solo es "roto" si el producto es de una categoría cara
  // (un celular/heladera/TV no puede costar eso). Los accesorios baratos
  // (cables, controles, auriculares in-ear) a ese precio son legítimos: se respetan.
  const EXPENSIVE = /celular|smartphone|heladera|freezer|lavarropas|lavasecarropas|secarropas|notebook|smart\s?tv|televisor|\btv\b|aire acond|split|cocina|microondas|lavavajillas|monitor|tablet|consola/i;
  const broken = rows.filter((r) => EXPENSIVE.test(r.title));

  console.log(`Ofertas < $${FLOOR.toLocaleString("es-AR")}: ${rows.length} (rotas por categoría cara: ${broken.length})`);
  console.log(`Modo: ${APPLY ? "APPLY (marca no disponibles)" : "DRY-RUN"}\n`);
  for (const r of rows) {
    const mark = broken.includes(r) ? "🗑️ ROTO " : "  legít ";
    console.log(` ${mark} $${r.price.toLocaleString("es-AR").padStart(10)}  ${r.store.padEnd(9)} ${r.title.slice(0, 52)}`);
  }

  if (APPLY && broken.length) {
    await prisma.productOffer.updateMany({ where: { id: { in: broken.map((r) => r.id) } }, data: { available: false } });
    console.log(`\nMarcadas available=false: ${broken.length}`);
  } else if (!APPLY) {
    console.log(`\n(dry-run: nada escrito.)`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
