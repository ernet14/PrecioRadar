import { getPrismaClient } from "@/lib/prisma";
import type { BankPromo } from "@/generated/prisma/client";
import { logger } from "@/lib/logger";

export type { BankPromo };

function db() {
  const client = getPrismaClient();
  if (!client) throw new Error("Database not configured");
  return client;
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function formatDayOfWeek(days: number[]): string {
  if (days.length === 0) return "Todos los días";
  return days.map((d) => DAY_NAMES[d] ?? String(d)).join(", ");
}

export function isTodayEligible(promo: BankPromo): boolean {
  const today = new Date().getDay();
  if (promo.dayOfWeek.length === 0) return true;
  return promo.dayOfWeek.includes(today);
}

export async function getActivePromosForToday(storeSlug?: string): Promise<BankPromo[]> {
  const now = new Date();
  const prisma = getPrismaClient();

  if (!prisma) return [];

  try {
    return await prisma.bankPromo.findMany({
      where: {
        active: true,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        ...(storeSlug ? { OR: [{ storeSlug }, { storeSlug: null }] } : {}),
      },
      orderBy: [{ discountPct: "desc" }, { entity: "asc" }],
    });
  } catch (error) {
    logger.error("Unable to load active bank promos.", { error });
    return [];
  }
}

export async function listAllBankPromos(): Promise<BankPromo[]> {
  return db().bankPromo.findMany({
    orderBy: [{ active: "desc" }, { entity: "asc" }],
  });
}

export async function createBankPromo(data: {
  entity: string;
  entitySlug: string;
  dayOfWeek: number[];
  discountPct: number;
  promoType?: string;
  maxAmount?: number | null;
  storeSlug?: string | null;
  paymentType?: string;
  validFrom?: Date;
  validUntil?: Date | null;
  sourceUrl?: string | null;
  notes?: string | null;
}): Promise<BankPromo> {
  return db().bankPromo.create({ data });
}

export async function toggleBankPromoActive(id: string, active: boolean): Promise<BankPromo> {
  return db().bankPromo.update({ where: { id }, data: { active } });
}

export async function deleteBankPromo(id: string): Promise<void> {
  await db().bankPromo.delete({ where: { id } });
}
