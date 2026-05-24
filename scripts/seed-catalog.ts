// Seeder de catálogo curado (Etapa 19 — densificar la comparación).
//
// Por qué existe: los comparables (productos con ofertas de 2+ tiendas) solo
// nacen cuando una búsqueda devuelve el MISMO producto en varias tiendas y el
// flujo de persistencia los agrupa por clave canónica. El catálogo histórico se
// sembró por tienda sin asegurar solape (solo ~8% comparables). Este script
// busca una lista curada de modelos en cada tienda VTEX, elige el resultado
// correcto (filtra accesorios/repuestos por tokens) y lo persiste por el flujo
// real (persistProductOfferView → getCanonicalProductKey), maximizando el solape.
//
// Uso:
//   node --import tsx --env-file=.env scripts/seed-catalog.mts            # dry-run (no escribe)
//   node --import tsx --env-file=.env scripts/seed-catalog.mts --apply    # persiste en DB
//
// Es idempotente: persistProductOfferView hace upsert por (tienda, externalId) y
// por slug canónico, así que re-correrlo no duplica.
import { vtexProviders } from "../src/providers/stores/vtexStores";
import { persistProductOfferView } from "../src/services/priceSnapshotService";
import { getCanonicalProductKey, normalizeProductName } from "../src/lib/utils/text";
import type { ProviderProduct } from "../src/providers/stores/types";

const APPLY = process.argv.includes("--apply");

// q = búsqueda; must = todos estos tokens deben estar en el título (normalizado);
// not = ninguno (descarta accesorios/variantes equivocadas).
type Model = { q: string; must: string[]; not?: string[] };
const MODELS: Model[] = [
  // --- Celulares (ahora agrupan por marca+modelo+almacenamiento) ---
  { q: "Samsung Galaxy A15", must: ["a15"], not: ["funda", "vidrio", "bandeja", "watch", "5g"] },
  { q: "Samsung Galaxy A55", must: ["a55"], not: ["funda", "vidrio", "watch"] },
  { q: "Samsung Galaxy A35", must: ["a35"], not: ["funda", "vidrio", "watch"] },
  { q: "Samsung Galaxy S24 Ultra", must: ["s24", "ultra"], not: ["funda", "vidrio", "cable", "auricular"] },
  { q: "Motorola Moto G24", must: ["g24"], not: ["funda", "auricular", "buds", "power"] },
  { q: "Motorola Edge 50 Fusion", must: ["edge", "50", "fusion"], not: ["funda"] },
  { q: "Xiaomi Redmi Note 13", must: ["redmi", "note", "13"], not: ["funda", "14", "pro"] },
  { q: "Xiaomi Redmi 13C", must: ["redmi", "13c"], not: ["funda", "note"] },
  { q: "iPhone 15 128GB", must: ["iphone", "15"], not: ["funda", "vidrio", "cable", "pro", "plus"] },
  { q: "iPhone 13 128GB", must: ["iphone", "13"], not: ["funda", "vidrio", "cable", "pro", "mini"] },
  // --- TVs (agrupan por EAN/SKU a través de súper+electro, ya validado) ---
  { q: "Samsung Crystal UHD 50 U8000", must: ["50", "u8000"], not: ["soporte", "business"] },
  { q: "Samsung Crystal UHD 55 U8000", must: ["55", "u8000"], not: ["soporte", "business"] },
  { q: "Samsung Crystal UHD 65 U8000", must: ["65", "u8000"], not: ["soporte", "business", "50", "55", "75"] },
  { q: "LG Smart TV 50 UHD 4K 50UA8050PSA", must: ["50ua8050psa"], not: ["soporte"] },
  { q: "Samsung Smart TV QLED 65 Q6FAA", must: ["qn65q6faagczb"], not: ["soporte", "business"] },
  // Variantes de tamaño de familias ya validadas (agrupan por SKU/EAN igual que sus hermanas).
  { q: "Samsung Crystal UHD 75 U8000", must: ["75", "u8000"], not: ["soporte", "business", "43", "50", "55", "65"] },
  { q: "Samsung Smart TV QLED 55 Q6FAA", must: ["qn55q6faagczb"], not: ["soporte", "business"] },
  // TVs entrada (Crystal UHD DU7000) — agrupan por EAN súper+electro.
  { q: "Samsung Crystal UHD 50 DU7000", must: ["50", "du7000"], not: ["soporte", "business", "43", "55", "65"] },
  { q: "Samsung Crystal UHD 43 DU7000", must: ["43", "du7000"], not: ["soporte", "business", "50", "55", "65"] },
  // Primera línea blanca / electro: heladera, microondas, lavarropas (agrupan por EAN).
  { q: "Heladera Samsung No Frost RT38", must: ["samsung", "rt38"], not: ["soporte", "funda"] },
  { q: "Microondas BGH B223D", must: ["bgh", "b223d"], not: [] },
  { q: "Lavarropas Samsung WW90", must: ["samsung", "ww90"], not: ["soporte"] },
];

const normalize = (s: string) => normalizeProductName(s);

async function pickForStore(provider: (typeof vtexProviders)[number], model: Model): Promise<ProviderProduct | null> {
  try {
    const results = await provider.searchProducts(model.q);
    const candidates = results
      .filter((r) => r.price > 0)
      .filter((r) => {
        const n = normalize(r.name);
        const toks = n.split(" ");
        return model.must.every((t) => toks.includes(normalize(t)) || n.includes(normalize(t))) &&
          !(model.not ?? []).some((t) => toks.includes(normalize(t)));
      })
      .sort((a, b) => a.price - b.price);
    return candidates[0] ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const providers = vtexProviders.filter((p) => !p.blocked);
  console.log(`Tiendas activas: ${providers.map((p) => p.name).join(", ")}`);
  console.log(`Modo: ${APPLY ? "APPLY (escribe en DB)" : "DRY-RUN (no escribe)"}\n`);

  let projectedComparables = 0;
  let persisted = 0;
  const allPicks: ProviderProduct[] = [];

  for (const model of MODELS) {
    const picks = (await Promise.all(providers.map((p) => pickForStore(p, model)))).filter(
      (p): p is ProviderProduct => p !== null,
    );
    const keyToStores = new Map<string, Set<string>>();
    for (const pick of picks) {
      const key = getCanonicalProductKey({ name: pick.name, brand: pick.brand, ean: pick.ean }) ?? `(sin-clave)`;
      if (!keyToStores.has(key)) keyToStores.set(key, new Set());
      keyToStores.get(key)!.add(pick.storeName);
      allPicks.push(pick);
    }
    const grouped = [...keyToStores.entries()].filter(([k, s]) => k !== "(sin-clave)" && s.size >= 2);
    const willCompare = grouped.length > 0;
    if (willCompare) projectedComparables++;

    console.log(`${willCompare ? "✅" : "··"} ${model.q}  (${picks.length} tiendas)`);
    for (const [key, stores] of keyToStores) {
      const mark = stores.size >= 2 && key !== "(sin-clave)" ? "  → COMPARABLE" : "";
      console.log(`     ${key.padEnd(34)} ${[...stores].join(", ")}${mark}`);
    }
  }

  if (APPLY) {
    console.log(`\nPersistiendo ${allPicks.length} ofertas (secuencial)...`);
    for (const pick of allPicks) {
      await persistProductOfferView(pick);
      persisted++;
    }
    console.log(`Persistidas: ${persisted}`);
  }

  console.log(`\n=== RESUMEN ===`);
  console.log(`Modelos que quedarían comparables (2+ tiendas, misma clave): ${projectedComparables}/${MODELS.length}`);
  console.log(`Ofertas candidatas: ${allPicks.length}`);
  if (!APPLY) console.log(`(dry-run: nada escrito. Correr con --apply para persistir.)`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
