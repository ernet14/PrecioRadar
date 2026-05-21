import { getPrismaClient } from "@/lib/prisma";
import { formatCurrencyARS } from "@/lib/utils";
import { logger } from "@/lib/logger";
import {
  sendAlertFulfilledEmail,
  type SendAlertEmailResult,
} from "@/services/emailService";
import { createNotification } from "@/services/notificationService";
import { sendPushToUser } from "@/services/pushService";
import {
  getMockProductDetailBySlug,
  getProductDetailBySlug,
  type ProductDetail,
} from "@/services/productService";

export const FREE_ACTIVE_ALERT_LIMIT = 3;
const ALERT_NOTIFICATION_COOLDOWN_HOURS = 24;

export type CreateAlertInput =
  | {
      alertType: "TARGET_PRICE";
      productSlug: string;
      targetPrice: number;
    }
  | {
      alertType: "PERCENTAGE_DROP";
      productSlug: string;
      targetPercentage: number;
    };

export type CreateAlertResult =
  | { status: "created" }
  | { status: "limit_reached"; limit: typeof FREE_ACTIVE_ALERT_LIMIT }
  | { status: "not_found" }
  | { status: "invalid" }
  | { status: "database_unavailable"; reason: string }
  | { status: "error" };

export type UpdateAlertStatusResult =
  | { status: "paused" }
  | { status: "reactivated" }
  | { status: "deleted" }
  | { status: "limit_reached"; limit: typeof FREE_ACTIVE_ALERT_LIMIT }
  | { status: "not_found" }
  | { status: "database_unavailable"; reason: string }
  | { status: "error" };

export type UserAlertListItem = {
  id: string;
  productSlug: string;
  productName: string;
  productImageUrl?: string | null;
  currentPriceLabel: string;
  storeName: string;
  alertType: "TARGET_PRICE" | "PERCENTAGE_DROP";
  targetPriceLabel?: string | null;
  targetPercentageLabel?: string | null;
  active: boolean;
  paused: boolean;
  createdAt: Date;
};

export type AlertOverview =
  | {
      status: "anonymous";
      limit: typeof FREE_ACTIVE_ALERT_LIMIT;
      activeCount: 0;
      reason?: string;
    }
  | {
      status: "ready";
      limit: typeof FREE_ACTIVE_ALERT_LIMIT;
      activeCount: number;
      reason?: string;
    }
  | {
      status: "unavailable";
      limit: typeof FREE_ACTIVE_ALERT_LIMIT;
      activeCount: 0;
      reason: string;
    };

export type EvaluateAlertsResult =
  | {
      status: "evaluated";
      createdCount: number;
      emailFailedCount: number;
      emailSentCount: number;
      emailSkippedCount: number;
      evaluatedCount: number;
    }
  | { status: "database_unavailable"; reason: string }
  | { status: "error" };

export type EvaluateAllAlertsResult =
  | {
      status: "evaluated";
      createdCount: number;
      emailFailedCount: number;
      emailSentCount: number;
      emailSkippedCount: number;
      evaluatedCount: number;
      failedUserCount: number;
      userCount: number;
    }
  | { status: "database_unavailable"; reason: string }
  | { status: "error" };

const missingDatabaseReason =
  "Falta configurar DATABASE_URL o DIRECT_URL con la conexion Postgres de Supabase.";

function createCategoryName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function ensureProductForAlert(slug: string) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  const existingProduct = await prisma.product.findUnique({
    where: { slug },
  });

  if (existingProduct) {
    return existingProduct;
  }

  const mockDetail = getMockProductDetailBySlug(slug);

  if (!mockDetail) {
    return null;
  }

  const categorySlug = mockDetail.categorySlug ?? "demo";
  const category = await prisma.category.upsert({
    where: { slug: categorySlug },
    update: { active: true },
    create: {
      name: createCategoryName(categorySlug),
      slug: categorySlug,
      description: "Categoria demo creada al crear una alerta.",
      active: true,
      featured: false,
    },
  });

  return prisma.product.upsert({
    where: { slug: mockDetail.slug },
    update: {
      name: mockDetail.name,
      brand: mockDetail.brand,
      model: mockDetail.model,
      categoryId: category.id,
      imageUrl: mockDetail.imageUrl,
      normalizedName: mockDetail.normalizedName,
      isDemo: true,
    },
    create: {
      name: mockDetail.name,
      slug: mockDetail.slug,
      brand: mockDetail.brand,
      model: mockDetail.model,
      categoryId: category.id,
      imageUrl: mockDetail.imageUrl,
      normalizedName: mockDetail.normalizedName,
      isDemo: true,
    },
  });
}

function hasValidTarget(input: CreateAlertInput) {
  if (input.alertType === "TARGET_PRICE") {
    return Number.isFinite(input.targetPrice) && input.targetPrice > 0;
  }

  return (
    Number.isFinite(input.targetPercentage) &&
    input.targetPercentage > 0 &&
    input.targetPercentage <= 100
  );
}

async function countActiveAlerts(userId: string) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return 0;
  }

  return prisma.alert.count({
    where: {
      userId,
      active: true,
      paused: false,
    },
  });
}

function createUserAlertListItem(
  alert: {
    id: string;
    alertType: "TARGET_PRICE" | "PERCENTAGE_DROP";
    targetPrice: unknown;
    targetPercentage: unknown;
    active: boolean;
    paused: boolean;
    createdAt: Date;
    product: { slug: string; name: string; imageUrl?: string | null };
  },
  product: ProductDetail,
): UserAlertListItem {
  const targetPrice =
    alert.targetPrice === null || alert.targetPrice === undefined
      ? null
      : Number(alert.targetPrice);
  const targetPercentage =
    alert.targetPercentage === null || alert.targetPercentage === undefined
      ? null
      : Number(alert.targetPercentage);

  return {
    id: alert.id,
    productSlug: product.slug,
    productName: product.name,
    productImageUrl: product.imageUrl ?? alert.product.imageUrl,
    currentPriceLabel: formatCurrencyARS(product.bestOffer.price),
    storeName: product.bestOffer.storeName,
    alertType: alert.alertType,
    targetPriceLabel:
      targetPrice === null || Number.isNaN(targetPrice)
        ? null
        : formatCurrencyARS(targetPrice),
    targetPercentageLabel:
      targetPercentage === null || Number.isNaN(targetPercentage)
        ? null
        : `${targetPercentage}%`,
    active: alert.active,
    paused: alert.paused,
    createdAt: alert.createdAt,
  };
}

function wasNotifiedRecently(lastNotifiedAt: Date | null) {
  if (!lastNotifiedAt) {
    return false;
  }

  const cooldownMs = ALERT_NOTIFICATION_COOLDOWN_HOURS * 60 * 60 * 1000;
  return Date.now() - lastNotifiedAt.getTime() < cooldownMs;
}

function getPercentageDropFromMax(product: ProductDetail) {
  const maxPrice = product.priceHistoryStats.maxPrice;

  if (maxPrice <= 0) {
    return 0;
  }

  return ((maxPrice - product.bestOffer.price) / maxPrice) * 100;
}

function getAlertMatchMessage({
  alertType,
  currentPrice,
  product,
  targetPercentage,
  targetPrice,
}: {
  alertType: "TARGET_PRICE" | "PERCENTAGE_DROP";
  currentPrice: number;
  product: ProductDetail;
  targetPercentage: number | null;
  targetPrice: number | null;
}) {
  if (alertType === "TARGET_PRICE") {
    if (targetPrice === null || currentPrice > targetPrice) {
      return null;
    }

    return {
      conditionLabel: `Precio actual menor o igual a ${formatCurrencyARS(
        targetPrice,
      )}`,
      title: "Alerta de precio cumplida",
      message: `${product.name} esta en ${formatCurrencyARS(
        currentPrice,
      )}, por debajo de tu objetivo de ${formatCurrencyARS(targetPrice)}.`,
    };
  }

  if (targetPercentage === null) {
    return null;
  }

  const percentageDrop = getPercentageDropFromMax(product);

  if (percentageDrop < targetPercentage) {
    return null;
  }

  return {
    conditionLabel: `Baja de ${percentageDrop.toFixed(
      1,
    )}% respecto del maximo reciente`,
    title: "Alerta de baja cumplida",
    message: `${product.name} bajo ${percentageDrop.toFixed(
      1,
    )}% respecto de su maximo reciente y cumple tu alerta de ${targetPercentage}%.`,
  };
}

function getAppBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

function getComparisonUrl(productSlug: string) {
  return `${getAppBaseUrl()}/producto/${productSlug}`;
}

function trackEmailResult(
  result: SendAlertEmailResult,
  counts: {
    failed: number;
    sent: number;
    skipped: number;
  },
) {
  if (result.status === "sent") {
    counts.sent += 1;
    return;
  }

  if (result.status === "skipped") {
    counts.skipped += 1;
    return;
  }

  counts.failed += 1;
}

export async function getAlertOverviewForUser(
  userId: string | null | undefined,
): Promise<AlertOverview> {
  if (!userId) {
    return {
      status: "anonymous",
      limit: FREE_ACTIVE_ALERT_LIMIT,
      activeCount: 0,
    };
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    return {
      status: "unavailable",
      limit: FREE_ACTIVE_ALERT_LIMIT,
      activeCount: 0,
      reason: missingDatabaseReason,
    };
  }

  try {
    return {
      status: "ready",
      limit: FREE_ACTIVE_ALERT_LIMIT,
      activeCount: await countActiveAlerts(userId),
    };
  } catch (error) {
    logger.error("Unable to load alert overview.", { error });
    return {
      status: "unavailable",
      limit: FREE_ACTIVE_ALERT_LIMIT,
      activeCount: 0,
      reason:
        "No pudimos leer Alert. Verifica que el schema Prisma este aplicado en Supabase.",
    };
  }
}

export async function createAlert(
  userId: string,
  input: CreateAlertInput,
): Promise<CreateAlertResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", reason: missingDatabaseReason };
  }

  if (!hasValidTarget(input)) {
    return { status: "invalid" };
  }

  try {
    const product = await ensureProductForAlert(input.productSlug);

    if (!product) {
      return { status: "not_found" };
    }

    const activeAlertCount = await countActiveAlerts(userId);

    if (activeAlertCount >= FREE_ACTIVE_ALERT_LIMIT) {
      return { status: "limit_reached", limit: FREE_ACTIVE_ALERT_LIMIT };
    }

    await prisma.alert.create({
      data: {
        userId,
        productId: product.id,
        alertType: input.alertType,
        targetPrice:
          input.alertType === "TARGET_PRICE" ? input.targetPrice : null,
        targetPercentage:
          input.alertType === "PERCENTAGE_DROP"
            ? input.targetPercentage
            : null,
        notificationChannel: "INTERNAL",
        active: true,
        paused: false,
      },
    });

    return { status: "created" };
  } catch (error) {
    logger.error("Unable to create alert.", { error });
    return { status: "error" };
  }
}

export async function pauseAlert(
  userId: string,
  alertId: string,
): Promise<UpdateAlertStatusResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", reason: missingDatabaseReason };
  }

  try {
    const result = await prisma.alert.updateMany({
      where: { id: alertId, userId },
      data: { paused: true },
    });

    return result.count > 0 ? { status: "paused" } : { status: "not_found" };
  } catch (error) {
    logger.error("Unable to pause alert.", { error });
    return { status: "error" };
  }
}

export async function reactivateAlert(
  userId: string,
  alertId: string,
): Promise<UpdateAlertStatusResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", reason: missingDatabaseReason };
  }

  try {
    const existingAlert = await prisma.alert.findFirst({
      where: { id: alertId, userId },
      select: { id: true, paused: true },
    });

    if (!existingAlert) {
      return { status: "not_found" };
    }

    if (existingAlert.paused) {
      const activeAlertCount = await countActiveAlerts(userId);

      if (activeAlertCount >= FREE_ACTIVE_ALERT_LIMIT) {
        return { status: "limit_reached", limit: FREE_ACTIVE_ALERT_LIMIT };
      }
    }

    await prisma.alert.update({
      where: { id: alertId },
      data: { active: true, paused: false },
    });

    return { status: "reactivated" };
  } catch (error) {
    logger.error("Unable to reactivate alert.", { error });
    return { status: "error" };
  }
}

export async function deleteAlert(
  userId: string,
  alertId: string,
): Promise<UpdateAlertStatusResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", reason: missingDatabaseReason };
  }

  try {
    const result = await prisma.alert.deleteMany({
      where: { id: alertId, userId },
    });

    return result.count > 0 ? { status: "deleted" } : { status: "not_found" };
  } catch (error) {
    logger.error("Unable to delete alert.", { error });
    return { status: "error" };
  }
}

export async function listUserAlerts(
  userId: string,
): Promise<UserAlertListItem[]> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return [];
  }

  const alerts = await prisma.alert.findMany({
    where: { userId },
    include: {
      product: {
        select: {
          slug: true,
          name: true,
          imageUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return Promise.all(
    alerts.map(async (alert) => {
      const targetPrice =
        alert.targetPrice === null ? null : Number(alert.targetPrice);
      const targetPercentage =
        alert.targetPercentage === null ? null : Number(alert.targetPercentage);

      // Fallback con lo persistido: si el detalle no resuelve, igual mostramos
      // la alerta (sin precio actual) en vez de dropearla.
      const fallback: UserAlertListItem = {
        id: alert.id,
        productSlug: alert.product.slug,
        productName: alert.product.name,
        productImageUrl: alert.product.imageUrl ?? null,
        currentPriceLabel: "Sin precio actual",
        storeName: "—",
        alertType: alert.alertType,
        targetPriceLabel:
          targetPrice === null || Number.isNaN(targetPrice)
            ? null
            : formatCurrencyARS(targetPrice),
        targetPercentageLabel:
          targetPercentage === null || Number.isNaN(targetPercentage)
            ? null
            : `${targetPercentage}%`,
        active: alert.active,
        paused: alert.paused,
        createdAt: alert.createdAt,
      };

      try {
        const product = await getProductDetailBySlug(alert.product.slug);
        return product ? createUserAlertListItem(alert, product) : fallback;
      } catch (error) {
        logger.error("Unable to resolve alert product detail; using stored data.", {
          error,
        });
        return fallback;
      }
    }),
  );
}

export async function evaluateUserAlerts(
  userId: string,
): Promise<EvaluateAlertsResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", reason: missingDatabaseReason };
  }

  try {
    const alerts = await prisma.alert.findMany({
      where: {
        userId,
        active: true,
        paused: false,
      },
      include: {
        product: {
          select: {
            slug: true,
          },
        },
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    let createdCount = 0;
    const emailCounts = {
      failed: 0,
      sent: 0,
      skipped: 0,
    };

    for (const alert of alerts) {
      if (wasNotifiedRecently(alert.lastNotifiedAt)) {
        continue;
      }

      // Resuelve productos reales (DB) además del demo; antes era mock-only y
      // las alertas sobre productos reales nunca se evaluaban ni disparaban.
      const product = await getProductDetailBySlug(alert.product.slug);

      if (!product) {
        continue;
      }

      const notification = getAlertMatchMessage({
        alertType: alert.alertType,
        currentPrice: product.bestOffer.price,
        product,
        targetPercentage:
          alert.targetPercentage === null ? null : Number(alert.targetPercentage),
        targetPrice: alert.targetPrice === null ? null : Number(alert.targetPrice),
      });

      if (!notification) {
        continue;
      }

      const result = await createNotification({
        userId,
        title: notification.title,
        message: notification.message,
        type: "PRICE_ALERT",
      });

      if (result.status !== "created") {
        continue;
      }

      const emailResult = await sendAlertFulfilledEmail({
        alertId: alert.id,
        comparisonUrl: getComparisonUrl(product.slug),
        conditionLabel: notification.conditionLabel,
        product,
        recipientEmail: alert.user.email,
      });
      trackEmailResult(emailResult, emailCounts);

      // Web Push complementario (no-op si no hay claves VAPID configuradas).
      await sendPushToUser(userId, {
        title: notification.title,
        body: notification.message,
        url: `/producto/${product.slug}`,
        tag: `alert-${alert.id}`,
      }).catch(() => {});

      await prisma.alert.update({
        where: { id: alert.id },
        data: { lastNotifiedAt: new Date() },
      });
      createdCount += 1;
    }

    return {
      status: "evaluated",
      createdCount,
      emailFailedCount: emailCounts.failed,
      emailSentCount: emailCounts.sent,
      emailSkippedCount: emailCounts.skipped,
      evaluatedCount: alerts.length,
    };
  } catch (error) {
    logger.error("Unable to evaluate alerts.", { error });
    return { status: "error" };
  }
}

export async function evaluateAllUserAlerts(): Promise<EvaluateAllAlertsResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", reason: missingDatabaseReason };
  }

  try {
    const activeAlerts = await prisma.alert.findMany({
      orderBy: {
        createdAt: "asc",
      },
      select: {
        userId: true,
      },
      where: {
        active: true,
        paused: false,
      },
    });
    const userIds = Array.from(
      new Set(activeAlerts.map((alert) => alert.userId)),
    );
    const totals = {
      createdCount: 0,
      emailFailedCount: 0,
      emailSentCount: 0,
      emailSkippedCount: 0,
      evaluatedCount: 0,
      failedUserCount: 0,
    };

    for (const userId of userIds) {
      const result = await evaluateUserAlerts(userId);

      if (result.status !== "evaluated") {
        totals.failedUserCount += 1;
        continue;
      }

      totals.createdCount += result.createdCount;
      totals.emailFailedCount += result.emailFailedCount;
      totals.emailSentCount += result.emailSentCount;
      totals.emailSkippedCount += result.emailSkippedCount;
      totals.evaluatedCount += result.evaluatedCount;
    }

    return {
      ...totals,
      status: "evaluated",
      userCount: userIds.length,
    };
  } catch (error) {
    logger.error("Unable to evaluate all alerts.", { error });
    return { status: "error" };
  }
}
