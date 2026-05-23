import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { startOfDay } from "@/services/bankPromoService";
import { fetchBankPromoText, isAllowedBankUrl } from "@/services/bankPromoFetcher";
import { parseBankPromoText } from "@/services/bankPromoParser";
import { commercialEvents, type CommercialEvent } from "@/data/commercialEvents";

export type ImportBankPromosResult =
  | {
      createdCount: number;
      skippedCount: number;
      sourceCount: number;
      status: "imported";
      updatedCount: number;
      verifiedCount: number;
    }
  | { reason: string; status: "database_unavailable" }
  | { status: "error" };

export type BankPromoBotOverview =
  | {
      botPromos: {
        active: boolean;
        entity: string;
        id: string;
        notes: string | null;
        sourceUrl: string | null;
        updatedAt: Date;
        validFrom: Date;
        validUntil: Date | null;
      }[];
      lastRuns: {
        createdAt: Date;
        detectedErrors: unknown;
        metrics: unknown;
        status: string;
        summary: string;
      }[];
      sourceUrls: { allowed: boolean; url: string }[];
      status: "ready";
    }
  | { reason: string; status: "database_unavailable" | "error" };

const missingDatabaseReason =
  "Falta configurar DATABASE_URL o DIRECT_URL con la conexion Postgres de Supabase.";

type DetectedPromoEvent = Pick<CommercialEvent, "end" | "name" | "slug" | "start">;

type BankPromoImportCandidate =
  | {
      data: {
        active: boolean;
        dayOfWeek: number[];
        discountPct: number;
        entity: string;
        entitySlug: string;
        installments: number | null;
        maxAmount: number | null;
        notes: string;
        paymentType: string;
        promoType: string;
        sourceUrl: string;
        validFrom: Date;
        validUntil: Date | null;
      };
      events: DetectedPromoEvent[];
      status: "ready";
      verified: boolean;
    }
  | { reason: string; status: "skipped" };

export function parseBankPromoSourceUrls(value: string | undefined): string[] {
  if (!value) return [];

  return Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  );
}

export function isBankPromoBotAutopublishEnabled() {
  return true;
}

function hasUsableBenefit(draft: ReturnType<typeof parseBankPromoText>) {
  if (!draft.entity || !draft.entitySlug) return false;
  if (draft.promoType === "installments") return Boolean(draft.installments);
  return typeof draft.discountPct === "number" && draft.discountPct > 0;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const eventAliases: Record<string, string[]> = {
  "black-friday": ["black friday"],
  cybermonday: ["cyber monday", "cybermonday", "cyber week"],
  "dia-del-nino": ["dia del nino", "dia de la ninez", "dia de las infancias"],
  "dia-del-padre": ["dia del padre"],
  "electro-fest": ["electro fest", "electrofest"],
  "hot-sale": ["hot sale", "hotsale"],
  navidad: ["navidad", "fiestas"],
  "travel-sale": ["travel sale", "travelsale"],
};

function eventFamily(slug: string) {
  return slug.replace(/-\d{4}$/, "");
}

function eventDate(value: string, endOfDay = false) {
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
}

export function detectBankPromoEvents(text: string): DetectedPromoEvent[] {
  const normalizedText = normalizeText(text);
  const detected = new Map<string, DetectedPromoEvent>();

  for (const event of commercialEvents) {
    const family = eventFamily(event.slug);
    const aliases = [
      normalizeText(event.name),
      ...(eventAliases[family] ?? []),
    ];

    if (aliases.some((alias) => normalizedText.includes(alias))) {
      detected.set(event.slug, event);
    }
  }

  return Array.from(detected.values());
}

function isVerifiedCurrentPromo({
  now,
  validFrom,
  validUntil,
}: {
  now: Date;
  validFrom: Date | null;
  validUntil: Date | null;
}) {
  if (!validUntil) return false;

  const today = startOfDay(now);
  const startsAt = validFrom ?? today;

  return startsAt <= validUntil && validUntil >= today;
}

export function buildBankPromoImportCandidate({
  now = new Date(),
  sourceText,
  sourceUrl,
}: {
  now?: Date;
  sourceText: string;
  sourceUrl: string;
}): BankPromoImportCandidate {
  const detectedEvents = detectBankPromoEvents(sourceText);
  const draft = parseBankPromoText(sourceText, now);

  if (!hasUsableBenefit(draft)) {
    return { status: "skipped", reason: "missing_required_fields" };
  }

  const eventWithDates = detectedEvents[0] ?? null;
  const validFrom =
    draft.validFrom ??
    (eventWithDates ? eventDate(eventWithDates.start) : startOfDay(now));
  const validUntil =
    draft.validUntil ??
    (eventWithDates ? eventDate(eventWithDates.end, true) : null);
  const verified = isVerifiedCurrentPromo({ now, validFrom, validUntil });
  const noteParts = [
    verified ? "Bot promos bancarias: fuente verificada y vigencia detectada." : "Bot promos bancarias: revision requerida; falta vigencia confirmada o esta vencida.",
    detectedEvents.length > 0
      ? `Evento detectado: ${detectedEvents.map((event) => event.name).join(", ")}.`
      : null,
    draft.notes,
  ].filter(Boolean);

  return {
    data: {
      active: verified,
      dayOfWeek: draft.dayOfWeek,
      discountPct: draft.discountPct ?? 0,
      entity: draft.entity,
      entitySlug: draft.entitySlug,
      installments: draft.installments,
      maxAmount: draft.maxAmount,
      notes: noteParts.join(" "),
      paymentType: draft.paymentType,
      promoType: draft.promoType,
      sourceUrl,
      validFrom,
      validUntil,
    },
    events: detectedEvents,
    status: "ready",
    verified,
  };
}

async function logBankPromoBotRun(
  prisma: NonNullable<ReturnType<typeof getPrismaClient>>,
  result: Exclude<ImportBankPromosResult, { status: "database_unavailable" }>,
) {
  try {
    const status =
      result.status === "imported" && result.skippedCount > 0 ? "warn" : "ok";
    const summary =
      result.status === "imported"
        ? `Bot promos bancarias: ${result.createdCount} creadas, ${result.updatedCount} actualizadas, ${result.verifiedCount} verificadas, ${result.skippedCount} omitidas.`
        : "Bot promos bancarias: error inesperado.";

    await prisma.systemHealthLog.create({
      data: {
        detectedErrors:
          result.status === "imported" && result.skippedCount > 0
            ? { skippedCount: result.skippedCount }
            : undefined,
        emailSent: false,
        metrics: result as never,
        reportType: "bank-promo-bot",
        status,
        summary,
      },
    });
  } catch (error) {
    logger.error("Unable to log bank promo bot run.", {
      error,
      route: "bankPromoBotService.logBankPromoBotRun",
    });
  }
}

export async function importBankPromosFromConfiguredSources(
  now = new Date(),
): Promise<ImportBankPromosResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", reason: missingDatabaseReason };
  }

  const sources = parseBankPromoSourceUrls(process.env.BANK_PROMO_SOURCE_URLS);
  if (sources.length === 0) {
    const result = {
      createdCount: 0,
      skippedCount: 0,
      sourceCount: 0,
      status: "imported",
      updatedCount: 0,
      verifiedCount: 0,
    } as const;
    await logBankPromoBotRun(prisma, result);
    return result;
  }

  let createdCount = 0;
  let skippedCount = 0;
  let updatedCount = 0;
  let verifiedCount = 0;

  try {
    for (const sourceUrl of sources) {
      const fetched = await fetchBankPromoText(sourceUrl);

      if (fetched.status !== "ok") {
        skippedCount += 1;
        continue;
      }

      const candidate = buildBankPromoImportCandidate({
        now,
        sourceText: fetched.text,
        sourceUrl,
      });

      if (candidate.status === "skipped") {
        skippedCount += 1;
        continue;
      }

      if (candidate.verified) verifiedCount += 1;

      const existing = await prisma.bankPromo.findFirst({
        where: { sourceUrl },
        select: { id: true },
      });

      if (existing) {
        await prisma.bankPromo.update({
          where: { id: existing.id },
          data: candidate.data,
        });
        updatedCount += 1;
      } else {
        await prisma.bankPromo.create({ data: candidate.data });
        createdCount += 1;
      }
    }

    const result = {
      createdCount,
      skippedCount,
      sourceCount: sources.length,
      status: "imported",
      updatedCount,
      verifiedCount,
    } as const;
    await logBankPromoBotRun(prisma, result);
    return result;
  } catch (error) {
    logger.error("Unable to import bank promos from configured sources.", {
      error,
      route: "bankPromoBotService.importBankPromosFromConfiguredSources",
    });
    const result = { status: "error" } as const;
    await logBankPromoBotRun(prisma, result);
    return result;
  }
}

export async function getBankPromoBotOverview(): Promise<BankPromoBotOverview> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", reason: missingDatabaseReason };
  }

  try {
    const [botPromos, lastRuns] = await Promise.all([
      prisma.bankPromo.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
          active: true,
          entity: true,
          id: true,
          notes: true,
          sourceUrl: true,
          updatedAt: true,
          validFrom: true,
          validUntil: true,
        },
        take: 20,
        where: {
          sourceUrl: { not: null },
        },
      }),
      prisma.systemHealthLog.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          detectedErrors: true,
          metrics: true,
          status: true,
          summary: true,
        },
        take: 10,
        where: { reportType: "bank-promo-bot" },
      }),
    ]);

    return {
      botPromos,
      lastRuns,
      sourceUrls: parseBankPromoSourceUrls(process.env.BANK_PROMO_SOURCE_URLS).map(
        (url) => ({ allowed: isAllowedBankUrl(url), url }),
      ),
      status: "ready",
    };
  } catch (error) {
    logger.error("Unable to load bank promo bot overview.", {
      error,
      route: "bankPromoBotService.getBankPromoBotOverview",
    });
    return { status: "error", reason: "No pudimos cargar el bot de promos." };
  }
}
