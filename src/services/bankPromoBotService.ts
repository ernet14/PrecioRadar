import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { startOfDay } from "@/services/bankPromoService";
import type { BankPromo } from "@/generated/prisma/client";
import { fetchBankPromoText, isAllowedBankUrl } from "@/services/bankPromoFetcher";
import { parseBankPromoText } from "@/services/bankPromoParser";
import { commercialEvents, type CommercialEvent } from "@/data/commercialEvents";

export type ImportBankPromosResult =
  | {
      createdCount: number;
      reviewCount: number;
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
      botPromos: BankPromo[];
      lastRuns: {
        createdAt: Date;
        detectedErrors: unknown;
        metrics: unknown;
        status: string;
        summary: string;
      }[];
      sourceUrls: BankPromoBotSourceView[];
      status: "ready";
    }
  | { reason: string; status: "database_unavailable" | "error" };

const missingDatabaseReason =
  "Falta configurar DATABASE_URL o DIRECT_URL con la conexion Postgres de Supabase.";

type DetectedPromoEvent = Pick<CommercialEvent, "end" | "name" | "slug" | "start">;

type BankPromoBotSourceView = {
  active: boolean;
  allowed: boolean;
  id: string | null;
  lastCheckedAt: Date | null;
  lastMessage: string | null;
  lastStatus: string | null;
  source: "db" | "env";
  url: string;
};

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

export function mergeBankPromoSourceUrls(...groups: string[][]): string[] {
  return Array.from(new Set(groups.flat().map((url) => url.trim()).filter(Boolean)));
}

export function isBankPromoBotAutopublishEnabled() {
  return true;
}

function normalizeBankPromoSourceUrl(value: string) {
  try {
    const url = new URL(value.trim());
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function getConfiguredBankPromoSources(
  prisma: NonNullable<ReturnType<typeof getPrismaClient>>,
  { includeInactive = false }: { includeInactive?: boolean } = {},
): Promise<BankPromoBotSourceView[]> {
  const envSources = parseBankPromoSourceUrls(process.env.BANK_PROMO_SOURCE_URLS).map(
    (url) => ({
      active: true,
      allowed: isAllowedBankUrl(url),
      id: null,
      lastCheckedAt: null,
      lastMessage: null,
      lastStatus: null,
      source: "env" as const,
      url,
    }),
  );

  try {
    const dbSources = await prisma.bankPromoBotSource.findMany({
      orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
      select: {
        active: true,
        id: true,
        lastCheckedAt: true,
        lastMessage: true,
        lastStatus: true,
        url: true,
      },
      where: includeInactive ? undefined : { active: true },
    });

    if (dbSources.length === 0) return envSources;

    return dbSources.map((source) => ({
      ...source,
      allowed: isAllowedBankUrl(source.url),
      source: "db" as const,
    }));
  } catch (error) {
    logger.error("Unable to load bank promo bot sources; using env fallback.", {
      error,
      route: "bankPromoBotService.getConfiguredBankPromoSources",
    });
    return envSources;
  }
}

async function updateBankPromoSourceStatus(
  prisma: NonNullable<ReturnType<typeof getPrismaClient>>,
  source: BankPromoBotSourceView,
  status: string,
  message: string,
) {
  if (!source.id) return;

  await prisma.bankPromoBotSource.update({
    data: {
      lastCheckedAt: new Date(),
      lastMessage: message,
      lastStatus: status,
    },
    where: { id: source.id },
  });
}

export type BankPromoBotSourceMutationResult =
  | { status: "ok" }
  | { reason: string; status: "database_unavailable" | "invalid_url" | "not_allowed" | "error" };

export async function addBankPromoBotSource(
  rawUrl: string,
): Promise<BankPromoBotSourceMutationResult> {
  const prisma = getPrismaClient();
  if (!prisma) return { status: "database_unavailable", reason: missingDatabaseReason };

  const url = normalizeBankPromoSourceUrl(rawUrl);
  if (!url) return { status: "invalid_url", reason: "URL invalida." };
  if (!isAllowedBankUrl(url)) {
    return { status: "not_allowed", reason: "La URL no pertenece a un banco o billetera permitida." };
  }

  try {
    await prisma.bankPromoBotSource.upsert({
      create: { active: true, url },
      update: { active: true },
      where: { url },
    });
    return { status: "ok" };
  } catch (error) {
    logger.error("Unable to add bank promo bot source.", {
      error,
      route: "bankPromoBotService.addBankPromoBotSource",
    });
    return { status: "error", reason: "No se pudo guardar la fuente." };
  }
}

export async function setBankPromoBotSourceActive(
  id: string,
  active: boolean,
): Promise<BankPromoBotSourceMutationResult> {
  const prisma = getPrismaClient();
  if (!prisma) return { status: "database_unavailable", reason: missingDatabaseReason };

  try {
    await prisma.bankPromoBotSource.update({ data: { active }, where: { id } });
    return { status: "ok" };
  } catch (error) {
    logger.error("Unable to toggle bank promo bot source.", {
      error,
      route: "bankPromoBotService.setBankPromoBotSourceActive",
    });
    return { status: "error", reason: "No se pudo actualizar la fuente." };
  }
}

export async function deleteBankPromoBotSource(
  id: string,
): Promise<BankPromoBotSourceMutationResult> {
  const prisma = getPrismaClient();
  if (!prisma) return { status: "database_unavailable", reason: missingDatabaseReason };

  try {
    await prisma.bankPromoBotSource.delete({ where: { id } });
    return { status: "ok" };
  } catch (error) {
    logger.error("Unable to delete bank promo bot source.", {
      error,
      route: "bankPromoBotService.deleteBankPromoBotSource",
    });
    return { status: "error", reason: "No se pudo borrar la fuente." };
  }
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
  // Certifica que la promo este vigente HOY: sin fecha de fin no se autopublica,
  // y ademas debe haber empezado (validFrom <= hoy) y no haber vencido
  // (validUntil >= hoy). Una promo futura queda en revision, no se publica.
  if (!validUntil) return false;

  const today = startOfDay(now);
  const startsAt = validFrom ? startOfDay(validFrom) : today;

  return startsAt <= today && validUntil >= today;
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
    verified ? "Bot promos bancarias: fuente verificada y vigente hoy." : "Bot promos bancarias: revision requerida; no esta vigente hoy (sin fecha de fin confirmada, aun no empezo o ya vencio).",
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
        ? `Bot promos bancarias: ${result.createdCount} creadas, ${result.updatedCount} actualizadas, ${result.verifiedCount} verificadas, ${result.reviewCount} en revision, ${result.skippedCount} omitidas.`
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

  const sources = await getConfiguredBankPromoSources(prisma);
  if (sources.length === 0) {
    const result = {
      createdCount: 0,
      reviewCount: 0,
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
  let reviewCount = 0;
  let skippedCount = 0;
  let updatedCount = 0;
  let verifiedCount = 0;

  try {
    for (const source of sources) {
      const sourceUrl = source.url;

      if (!source.active || !source.allowed) {
        skippedCount += 1;
        await updateBankPromoSourceStatus(
          prisma,
          source,
          "skipped",
          source.allowed ? "Fuente pausada." : "URL fuera de allowlist.",
        );
        continue;
      }

      const fetched = await fetchBankPromoText(sourceUrl);

      if (fetched.status !== "ok") {
        skippedCount += 1;
        await updateBankPromoSourceStatus(
          prisma,
          source,
          fetched.status,
          fetched.status === "error" ? fetched.reason : "URL no permitida.",
        );
        continue;
      }

      const candidate = buildBankPromoImportCandidate({
        now,
        sourceText: fetched.text,
        sourceUrl,
      });

      if (candidate.status === "skipped") {
        skippedCount += 1;
        await updateBankPromoSourceStatus(prisma, source, "skipped", candidate.reason);
        continue;
      }

      if (candidate.verified) {
        verifiedCount += 1;
      } else {
        reviewCount += 1;
      }

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

      await updateBankPromoSourceStatus(
        prisma,
        source,
        candidate.verified ? "published" : "review",
        candidate.verified
          ? "Promo verificada y publicada."
          : "Promo importada inactiva para revision.",
      );
    }

    const result = {
      createdCount,
      reviewCount,
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
    const [botPromos, lastRuns, sourceUrls] = await Promise.all([
      prisma.bankPromo.findMany({
        orderBy: { updatedAt: "desc" },
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
      getConfiguredBankPromoSources(prisma, { includeInactive: true }),
    ]);

    return {
      botPromos,
      lastRuns,
      sourceUrls,
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
