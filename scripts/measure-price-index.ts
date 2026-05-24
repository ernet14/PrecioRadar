// Medición read-only del índice de precios (Etapa 19 — Fase 3).
//
// Uso:
//   node --import tsx --env-file=.env scripts/measure-price-index.ts
//
// No publica nada: solo muestra madurez por categoría para decidir cuándo
// habilitar una página pública sin vender un índice todavía inmaduro.
import { mvpCategoryDescriptors } from "../src/data/categories";
import { computePriceIndex, type PriceIndexResult } from "../src/services/priceIndexService";

const MIN_PUBLIC_DAYS = 30;
const MIN_PUBLIC_PRODUCTS = 30;
const MIN_LATEST_SAMPLE = 20;

function fmtPct(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function getLatestSample(index: PriceIndexResult) {
  return index.points.at(-1)?.sampleSize ?? 0;
}

function getStatus(index: PriceIndexResult) {
  const latestSample = getLatestSample(index);

  if (index.days >= MIN_PUBLIC_DAYS && index.productsTracked >= MIN_PUBLIC_PRODUCTS && latestSample >= MIN_LATEST_SAMPLE) {
    return "PUBLICABLE";
  }

  if (index.days > 0 && index.productsTracked > 0) {
    return "CONSTRUYENDO";
  }

  return "SIN_DATOS";
}

function printIndexLine(label: string, index: PriceIndexResult) {
  const latestSample = getLatestSample(index);
  const status = getStatus(index);
  const latest = index.latestIndex ?? "—";
  const range = index.baseDate && index.latestDate ? `${index.baseDate}..${index.latestDate}` : "—";

  console.log(
    `${label.padEnd(24)} ${status.padEnd(12)} idx=${String(latest).padEnd(7)} var=${fmtPct(index.totalChangePct).padEnd(8)} dias=${String(index.days).padStart(2)} prod=${String(index.productsTracked).padStart(3)} sample=${String(latestSample).padStart(3)} ${range}`,
  );
}

async function main() {
  console.log("=== Índice de precios por categoría ===");
  console.log(`Gate público: >=${MIN_PUBLIC_DAYS} días, >=${MIN_PUBLIC_PRODUCTS} productos, sample latest >=${MIN_LATEST_SAMPLE}\n`);

  const overall = await computePriceIndex();
  printIndexLine("Total", overall);

  for (const category of mvpCategoryDescriptors) {
    const index = await computePriceIndex({ categorySlug: category.slug });
    printIndexLine(category.slug, index);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
