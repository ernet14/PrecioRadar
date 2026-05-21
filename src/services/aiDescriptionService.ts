import { generateText } from "ai";
import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { formatCurrencyARS } from "@/lib/utils";

// Descripciones SEO de producto generadas por IA (Etapa 17).
// Usa el Vercel AI Gateway con un model string "openai/gpt-4o-mini".
// Es OPT-IN: requiere AI_GATEWAY_API_KEY. Si no está, no se intenta ninguna
// llamada (cero riesgo de cargos) y los endpoints devuelven ai_unavailable.
//
// La descripción es factual y SOLO usa datos provistos (nombre, marca, modelo,
// categoría, rango de precios, tiendas). El prompt prohíbe inventar specs u
// opiniones, en línea con la regla "nunca mostrar algo sin datos que lo sostengan".

const MODEL = process.env.AI_DESCRIPTION_MODEL?.trim() || "openai/gpt-4o-mini";
// Regenerar descripciones más viejas que esto (cambios de catálogo/precio).
const STALE_DAYS = 30;
const MAX_CHARS = 500;

type Prisma = NonNullable<ReturnType<typeof getPrismaClient>>;

export type GenerateDescriptionResult =
  | { status: "generated"; productId: string }
  | { status: "skipped"; reason: string }
  | { status: "error"; error: string };

function isGatewayConfigured() {
  // Opt-in explícito: requiere AI_GATEWAY_API_KEY. Sin ella el feature queda
  // degradado (no se intenta ninguna llamada al gateway → cero riesgo de cargos)
  // y los endpoints devuelven ai_unavailable.
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim());
}

function buildPrompt(input: {
  name: string;
  brand: string | null;
  model: string | null;
  categoryName: string | null;
  storeNames: string[];
  lowPrice: number;
  highPrice: number;
}) {
  const facts = [
    `Producto: ${input.name}`,
    input.brand ? `Marca: ${input.brand}` : null,
    input.model ? `Modelo: ${input.model}` : null,
    input.categoryName ? `Categoría: ${input.categoryName}` : null,
    `Tiendas que lo ofrecen: ${input.storeNames.join(", ")}`,
    input.lowPrice === input.highPrice
      ? `Precio: ${formatCurrencyARS(input.lowPrice)}`
      : `Rango de precios: ${formatCurrencyARS(input.lowPrice)} a ${formatCurrencyARS(input.highPrice)}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `Escribí una descripción breve (40 a 60 palabras, 2-3 oraciones) en español rioplatense para la página de un comparador de precios argentino.

Reglas estrictas:
- Usá SOLO los datos provistos. No inventes especificaciones técnicas, características ni opiniones.
- No prometas el "mejor precio" ni uses superlativos publicitarios.
- Tono informativo y neutral. Mencioná que se puede comparar el precio entre tiendas y ver el historial.
- No incluyas el precio exacto en el texto (cambia seguido).
- Una sola descripción, sin títulos ni comillas.

Datos:
${facts}`;
}

export async function generateProductDescription(
  productId: string,
): Promise<GenerateDescriptionResult> {
  const prisma = getPrismaClient();
  if (!prisma) return { status: "skipped", reason: "database_unavailable" };
  if (!isGatewayConfigured()) return { status: "skipped", reason: "ai_gateway_not_configured" };

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: { select: { name: true } },
        offers: {
          where: { isDemo: false, available: true },
          select: { price: true, store: { select: { name: true } } },
        },
      },
    });

    if (!product || product.offers.length === 0) {
      return { status: "skipped", reason: "no_offers" };
    }

    const prices = product.offers.map((o) => Number(o.price));
    const storeNames = Array.from(new Set(product.offers.map((o) => o.store.name)));

    const { text } = await generateText({
      model: MODEL,
      prompt: buildPrompt({
        name: product.name,
        brand: product.brand,
        model: product.model,
        categoryName: product.category?.name ?? null,
        storeNames,
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
      }),
      temperature: 0.4,
    });

    const description = text.trim().slice(0, MAX_CHARS);
    if (!description) return { status: "skipped", reason: "empty_completion" };

    await prisma.product.update({
      where: { id: productId },
      data: { aiDescription: description, aiDescriptionAt: new Date() },
    });

    return { status: "generated", productId };
  } catch (error) {
    logger.error("AI description generation failed.", {
      error,
      route: "aiDescriptionService.generateProductDescription",
    });
    return { status: "error", error: error instanceof Error ? error.message : "unknown" };
  }
}

export type BackfillResult = {
  status: "completed" | "database_unavailable" | "ai_unavailable";
  generated: number;
  skipped: number;
  errors: number;
};

// Genera descripciones para productos que no tienen una (o la tienen vieja).
// Secuencial y acotado por `limit` para controlar costo y rate limit.
export async function backfillProductDescriptions(limit = 20): Promise<BackfillResult> {
  const prisma = getPrismaClient();
  if (!prisma) return { status: "database_unavailable", generated: 0, skipped: 0, errors: 0 };
  if (!isGatewayConfigured()) return { status: "ai_unavailable", generated: 0, skipped: 0, errors: 0 };

  const staleBefore = new Date(Date.now() - STALE_DAYS * 24 * 3_600_000);

  const candidates = await selectCandidates(prisma, limit, staleBefore);

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const { id } of candidates) {
    const result = await generateProductDescription(id);
    if (result.status === "generated") generated += 1;
    else if (result.status === "error") errors += 1;
    else skipped += 1;
  }

  return { status: "completed", generated, skipped, errors };
}

async function selectCandidates(prisma: Prisma, limit: number, staleBefore: Date) {
  return prisma.product.findMany({
    where: {
      deletedAt: null,
      isDemo: false,
      offers: { some: { isDemo: false, available: true } },
      OR: [{ aiDescription: null }, { aiDescriptionAt: { lt: staleBefore } }],
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
    take: Math.max(1, Math.min(limit, 100)),
  });
}
