import { getPrismaClient } from "@/lib/prisma";
import type { BankPromo } from "@/generated/prisma/client";
import { logger } from "@/lib/logger";
import { formatCurrencyARS } from "@/lib/utils";
import type { ProviderProduct } from "@/providers/stores";
import { createNotification } from "@/services/notificationService";
import { getProductDetailBySlug } from "@/services/productService";

export type { BankPromo };

export type BankPromoPriceOption = {
  effectivePrice: number;
  offer: ProviderProduct;
  promo: BankPromo;
  savingsAmount: number;
};

export type BankPromoFilters = {
  categorySlug?: string | null;
  date?: Date;
  storeSlug?: string | null;
};

export type EvaluateBankPromoNotificationsResult =
  | {
      createdCount: number;
      evaluatedCount: number;
      status: "evaluated";
      trackedCount: number;
    }
  | { reason: string; status: "database_unavailable" }
  | { status: "error" };

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const missingDatabaseReason =
  "Falta configurar DATABASE_URL o DIRECT_URL con la conexion Postgres de Supabase.";

function db() {
  const client = getPrismaClient();
  if (!client) throw new Error("Database not configured");
  return client;
}

export function formatDayOfWeek(days: number[]): string {
  if (days.length === 0) return "Todos los dias";
  return days.map((d) => DAY_NAMES[d] ?? String(d)).join(", ");
}

export function startOfDay(date = new Date()): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date = new Date()): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function isPromoEligibleOnDate(
  promo: BankPromo,
  date = new Date(),
): boolean {
  if (promo.dayOfWeek.length === 0) return true;
  return promo.dayOfWeek.includes(date.getDay());
}

export function isTodayEligible(promo: BankPromo): boolean {
  return isPromoEligibleOnDate(promo);
}

export function formatPromoBenefit(promo: BankPromo): string {
  const installments =
    promo.installments && promo.installments > 1
      ? `${promo.installments} cuotas sin interes`
      : null;

  if (promo.promoType === "installments") {
    return installments ?? "Cuotas sin interes";
  }

  const discountLabel =
    promo.promoType === "refund"
      ? `${promo.discountPct}% reintegro`
      : `${promo.discountPct}% OFF`;
  const capLabel = promo.maxAmount
    ? `tope ${formatCurrencyARS(promo.maxAmount)}`
    : null;

  return [discountLabel, capLabel, installments].filter(Boolean).join(" - ");
}

export function isPromoApplicableToOffer(
  promo: BankPromo,
  offer: ProviderProduct,
  date = new Date(),
): boolean {
  if (!isPromoEligibleOnDate(promo, date)) return false;
  if (promo.commerceChannel === "physical") return false;
  if (promo.storeSlug && promo.storeSlug !== offer.storeSlug) return false;
  if (promo.categorySlug && promo.categorySlug !== offer.categorySlug) return false;

  return true;
}

export function calculateBankPromoSavings(price: number, promo: BankPromo): number {
  if (promo.promoType === "installments" || promo.discountPct <= 0) return 0;

  const rawSavings = Math.round(price * (promo.discountPct / 100));

  if (!promo.maxAmount) return rawSavings;

  return Math.min(rawSavings, promo.maxAmount);
}

export function calculateBankPromoEffectivePrice(
  price: number,
  promo: BankPromo,
): number {
  return Math.max(0, price - calculateBankPromoSavings(price, promo));
}

export function getTopBankPromoOptionsForOffers({
  date = new Date(),
  limit = 3,
  offers,
  promos,
}: {
  date?: Date;
  limit?: number;
  offers: ProviderProduct[];
  promos: BankPromo[];
}): BankPromoPriceOption[] {
  return offers
    .filter((offer) => offer.available)
    .flatMap((offer) =>
      promos
        .filter((promo) => isPromoApplicableToOffer(promo, offer, date))
        .map((promo) => ({
          effectivePrice: calculateBankPromoEffectivePrice(offer.price, promo),
          offer,
          promo,
          savingsAmount: calculateBankPromoSavings(offer.price, promo),
        })),
    )
    .filter(
      (option) =>
        option.savingsAmount > 0 ||
        (option.promo.installments !== null && option.promo.installments > 1),
    )
    .sort(
      (left, right) =>
        left.effectivePrice - right.effectivePrice ||
        right.savingsAmount - left.savingsAmount ||
        left.offer.price - right.offer.price ||
        left.promo.entity.localeCompare(right.promo.entity),
    )
    .slice(0, limit);
}

export async function getActivePromosForDate({
  categorySlug,
  date = new Date(),
  storeSlug,
}: BankPromoFilters = {}): Promise<BankPromo[]> {
  const prisma = getPrismaClient();

  if (!prisma) return [];

  try {
    const promos = await prisma.bankPromo.findMany({
      where: {
        AND: [
          { active: true },
          { validFrom: { lte: endOfDay(date) } },
          { OR: [{ validUntil: null }, { validUntil: { gte: startOfDay(date) } }] },
          ...(storeSlug ? [{ OR: [{ storeSlug }, { storeSlug: null }] }] : []),
          ...(categorySlug
            ? [{ OR: [{ categorySlug }, { categorySlug: null }] }]
            : []),
        ],
      },
      orderBy: [{ discountPct: "desc" }, { entity: "asc" }],
    });

    return promos.filter((promo) => isPromoEligibleOnDate(promo, date));
  } catch (error) {
    logger.error("Unable to load active bank promos.", { error });
    return [];
  }
}

export async function getActivePromosForToday(
  storeSlug?: string,
  filters: Omit<BankPromoFilters, "date" | "storeSlug"> = {},
): Promise<BankPromo[]> {
  return getActivePromosForDate({ ...filters, storeSlug });
}

export async function listAllBankPromos(): Promise<BankPromo[]> {
  return db().bankPromo.findMany({
    orderBy: [{ active: "desc" }, { entity: "asc" }],
  });
}

export async function createBankPromo(data: {
  categorySlug?: string | null;
  commerceChannel?: string;
  dayOfWeek: number[];
  discountPct: number;
  entity: string;
  entitySlug: string;
  installments?: number | null;
  maxAmount?: number | null;
  notes?: string | null;
  paymentType?: string;
  promoType?: string;
  sourceUrl?: string | null;
  storeSlug?: string | null;
  validFrom?: Date;
  validUntil?: Date | null;
}): Promise<BankPromo> {
  return db().bankPromo.create({ data });
}

export async function toggleBankPromoActive(
  id: string,
  active: boolean,
): Promise<BankPromo> {
  return db().bankPromo.update({ where: { id }, data: { active } });
}

export async function deleteBankPromo(id: string): Promise<void> {
  await db().bankPromo.delete({ where: { id } });
}

export async function evaluateBankPromoNotifications(): Promise<EvaluateBankPromoNotificationsResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", reason: missingDatabaseReason };
  }

  try {
    const today = new Date();
    const trackedProducts = await prisma.trackedProduct.findMany({
      include: {
        product: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    const promos = await getActivePromosForDate({ date: today });
    let createdCount = 0;
    let evaluatedCount = 0;

    for (const trackedProduct of trackedProducts) {
      const product = await getProductDetailBySlug(trackedProduct.product.slug);

      if (!product) continue;

      evaluatedCount += 1;
      const [bestOption] = getTopBankPromoOptionsForOffers({
        date: today,
        limit: 1,
        offers: product.offers,
        promos,
      });

      if (!bestOption) continue;

      const existing = await prisma.notification.findFirst({
        where: {
          createdAt: { gte: startOfDay(today) },
          message: { contains: `/producto/${product.slug}` },
          type: "BANK_PROMO_TODAY",
          userId: trackedProduct.userId,
        },
      });

      if (existing) continue;

      const result = await createNotification({
        userId: trackedProduct.userId,
        title: `Promo bancaria hoy: ${product.name}`,
        message: `${bestOption.promo.entity} deja ${bestOption.offer.storeName} en ${formatCurrencyARS(bestOption.effectivePrice)}. Ver: /producto/${product.slug}`,
        type: "BANK_PROMO_TODAY",
      });

      if (result.status === "created") {
        createdCount += 1;
      }
    }

    return {
      createdCount,
      evaluatedCount,
      status: "evaluated",
      trackedCount: trackedProducts.length,
    };
  } catch (error) {
    logger.error("Unable to evaluate bank promo notifications.", { error });
    return { status: "error" };
  }
}
