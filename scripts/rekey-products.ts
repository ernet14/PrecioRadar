// Re-key de productos con slug-por-nombre (Etapa 19 Fase 1, limpieza pre-SEO).
//
// Por qué: productos persistidos ANTES de la lógica de clave canónica quedaron
// con slug derivado del nombre (p.ej. "celular-galaxy-a55-5g-128-gb-lemon-samsung")
// y viven fuera del sistema canónico → duplican el producto canónico
// (phone-samsung-a55-128) y serían páginas thin/duplicadas en SEO. Acá recomputamos
// la clave canónica DESDE LA DB (nombre+marca; sin EAN, que no se persiste) y, si da
// una clave (phone/SKU), consolidamos: movemos ofertas + historial al Product
// canónico y soft-borramos el viejo. No toca las tiendas (sin red).
//
//   node --import tsx --env-file=.env scripts/rekey-products.ts          # dry-run
//   node --import tsx --env-file=.env scripts/rekey-products.ts --apply  # consolida
import { getPrismaClient } from "../src/lib/prisma";
import { getCanonicalProductKey, slugify } from "../src/lib/utils/text";

const APPLY = process.argv.includes("--apply");

async function main() {
  const prisma = getPrismaClient();
  if (!prisma) { console.log("Sin DB."); return; }

  const products = await prisma.product.findMany({
    where: { deletedAt: null, isDemo: false },
    select: { id: true, slug: true, name: true, brand: true, categoryId: true, imageUrl: true, normalizedName: true },
  });

  // Solo slug-por-nombre (fuera del sistema canónico) que AHORA derivan una clave
  // canónica distinta (phone/SKU; el EAN no está en DB).
  const plans = products
    .map((p) => ({ p, newKey: getCanonicalProductKey({ name: p.name, brand: p.brand, ean: null }) }))
    .filter((x) => x.p.slug === slugify(x.p.name) && x.newKey && x.newKey !== x.p.slug);

  const byKey = new Map<string, typeof plans>();
  for (const plan of plans) {
    if (!byKey.has(plan.newKey!)) byKey.set(plan.newKey!, []);
    byKey.get(plan.newKey!)!.push(plan);
  }

  console.log(`Productos slug-por-nombre re-keyables: ${plans.length} → ${byKey.size} claves canónicas`);
  console.log(`Modo: ${APPLY ? "APPLY (consolida)" : "DRY-RUN (no escribe)"}\n`);
  for (const [key, list] of byKey) {
    console.log(`${key}  ←  ${list.map((x) => x.p.slug).join(" | ")}`);
  }

  if (APPLY) {
    let moved = 0;
    for (const [key, list] of byKey) {
      const first = list[0].p;
      // Product canónico destino (existente o nuevo).
      const target = await prisma.product.upsert({
        where: { slug: key },
        update: { deletedAt: null },
        create: {
          slug: key, name: first.name, normalizedName: first.normalizedName,
          brand: first.brand ?? null, categoryId: first.categoryId,
          imageUrl: first.imageUrl ?? null, isDemo: false,
        },
      });
      for (const { p } of list) {
        if (p.id === target.id) continue;
        await prisma.productOffer.updateMany({ where: { productId: p.id }, data: { productId: target.id } });
        await prisma.priceHistory.updateMany({ where: { productId: p.id }, data: { productId: target.id } });
        await prisma.product.update({ where: { id: p.id }, data: { deletedAt: new Date() } });
        moved++;
      }
    }
    console.log(`\nConsolidados (soft-delete del viejo + ofertas/historial movidos): ${moved}`);
  } else {
    console.log(`\n(dry-run: nada escrito. Correr con --apply para consolidar.)`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
