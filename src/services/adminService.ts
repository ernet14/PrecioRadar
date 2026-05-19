import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";

type AdminCounts = {
  affiliateLinks: number;
  alerts: number;
  categories: number;
  clicks: number;
  offers: number;
  products: number;
  providerErrors: number;
  reports: number;
  searches: number;
  stores: number;
  users: number;
};

export type AdminPopularSearch = {
  count: number;
  query: string;
};

export type AdminProviderError = {
  action: string;
  createdAt: Date;
  errorMessage: string | null;
  provider: string;
  status: string;
};

export type AdminRecentReport = {
  createdAt: Date;
  id: string;
  message: string | null;
  offerTitle: string | null;
  productName: string | null;
  reason: string;
  status: AdminReportStatus;
};

export type AdminProductPreview = {
  categoryName: string;
  id: string;
  isDemo: boolean;
  name: string;
  offerCount: number;
  slug: string;
  updatedAt: Date;
};

export type AdminOfferPreview = {
  available: boolean;
  id: string;
  isDemo: boolean;
  price: string;
  productName: string;
  storeName: string;
  title: string;
  updatedAt: Date;
};

export type AdminStorePreview = {
  active: boolean;
  affiliateEnabled: boolean;
  id: string;
  isDemo: boolean;
  name: string;
  offerCount: number;
  slug: string;
};

export const ADMIN_REPORT_STATUSES = [
  "OPEN",
  "REVIEWED",
  "RESOLVED",
  "DISMISSED",
] as const;

export type AdminReportStatus = (typeof ADMIN_REPORT_STATUSES)[number];

export type AdminReportStatusCounts = Record<AdminReportStatus, number>;

export type AdminReportListItem = AdminRecentReport & {
  updatedAt: Date;
  userEmail: string | null;
};

export type AdminReportDetail =
  | {
      report: {
        createdAt: Date;
        id: string;
        message: string | null;
        offer: {
          price: string;
          productUrl: string;
          storeName: string;
          title: string;
        } | null;
        product: {
          name: string;
          slug: string;
        } | null;
        reason: string;
        status: AdminReportStatus;
        userEmail: string | null;
      };
      status: "ready";
    }
  | { reason: string; status: "database_unavailable" | "error" | "not_found" };

export type UpdateAdminReportStatusResult =
  | { reportStatus: AdminReportStatus; status: "updated" }
  | { status: "database_unavailable"; reason: string }
  | { status: "invalid" }
  | { status: "not_found" }
  | { status: "error" };

export type AdminReportList =
  | {
      reportStatusCounts: AdminReportStatusCounts;
      reports: AdminReportListItem[];
      selectedStatus: AdminReportStatus | null;
      status: "ready";
      totalCount: number;
    }
  | {
      reason: string;
      reportStatusCounts: AdminReportStatusCounts;
      reports: [];
      selectedStatus: AdminReportStatus | null;
      status: "database_unavailable" | "error";
      totalCount: 0;
    };

export type AdminOverview =
  | {
      counts: AdminCounts;
      products: AdminProductPreview[];
      offers: AdminOfferPreview[];
      popularSearches: AdminPopularSearch[];
      providerErrors: AdminProviderError[];
      recentReports: AdminRecentReport[];
      reportStatusCounts: AdminReportStatusCounts;
      stores: AdminStorePreview[];
      status: "ready";
    }
  | {
      counts: AdminCounts;
      products: [];
      offers: [];
      popularSearches: [];
      providerErrors: [];
      recentReports: [];
      reportStatusCounts: AdminReportStatusCounts;
      stores: [];
      reason: string;
      status: "database_unavailable" | "error";
    };

const emptyCounts: AdminCounts = {
  affiliateLinks: 0,
  alerts: 0,
  categories: 0,
  clicks: 0,
  offers: 0,
  products: 0,
  providerErrors: 0,
  reports: 0,
  searches: 0,
  stores: 0,
  users: 0,
};

const missingDatabaseReason =
  "Falta configurar DATABASE_URL o DIRECT_URL con la conexion Postgres de Supabase.";

function createEmptyReportStatusCounts(): AdminReportStatusCounts {
  return {
    DISMISSED: 0,
    OPEN: 0,
    RESOLVED: 0,
    REVIEWED: 0,
  };
}

function createReportStatusCounts(
  statusGroups: Array<{
    _count: { _all: number };
    status: AdminReportStatus;
  }>,
) {
  const counts = createEmptyReportStatusCounts();

  for (const statusGroup of statusGroups) {
    counts[statusGroup.status] = statusGroup._count._all;
  }

  return counts;
}

function isAdminReportStatus(value: string): value is AdminReportStatus {
  return ADMIN_REPORT_STATUSES.includes(value as AdminReportStatus);
}

function getPopularSearches(searchLogs: { query: string }[]) {
  const countsByQuery = new Map<string, number>();

  for (const searchLog of searchLogs) {
    const query = searchLog.query.trim();

    if (!query) {
      continue;
    }

    countsByQuery.set(query, (countsByQuery.get(query) ?? 0) + 1);
  }

  return Array.from(countsByQuery.entries())
    .map(([query, count]) => ({ count, query }))
    .sort(
      (left, right) =>
        right.count - left.count || left.query.localeCompare(right.query),
    )
    .slice(0, 5);
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return {
      counts: emptyCounts,
      products: [],
      offers: [],
      popularSearches: [],
      providerErrors: [],
      recentReports: [],
      reportStatusCounts: createEmptyReportStatusCounts(),
      stores: [],
      reason: missingDatabaseReason,
      status: "database_unavailable",
    };
  }

  try {
    const products = await prisma.product.count();
    const offers = await prisma.productOffer.count();
    const stores = await prisma.store.count();
    const categories = await prisma.category.count();
    const users = await prisma.user.count();
    const searches = await prisma.searchLog.count();
    const clicks = await prisma.clickTracking.count();
    const alerts = await prisma.alert.count();
    const reports = await prisma.productReport.count();
    const affiliateLinks = await prisma.affiliateLink.count();
    const providerErrors = await prisma.providerLog.count({
      where: {
        status: {
          notIn: ["ok", "ready", "success"],
        },
      },
    });
    const reportStatusGroups = await prisma.productReport.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    });
    const recentSearchLogs = await prisma.searchLog.findMany({
      orderBy: { createdAt: "desc" },
      select: { query: true },
      take: 100,
    });
    const recentProviderErrors = await prisma.providerLog.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        action: true,
        createdAt: true,
        errorMessage: true,
        provider: true,
        status: true,
      },
      take: 5,
      where: {
        status: {
          notIn: ["ok", "ready", "success"],
        },
      },
    });
    const recentReports = await prisma.productReport.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        id: true,
        message: true,
        offer: {
          select: {
            title: true,
          },
        },
        product: {
          select: {
            name: true,
          },
        },
        reason: true,
        status: true,
      },
      take: 5,
    });
    const recentProducts = await prisma.product.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        _count: {
          select: {
            offers: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
        id: true,
        isDemo: true,
        name: true,
        slug: true,
        updatedAt: true,
      },
      take: 5,
    });
    const recentOffers = await prisma.productOffer.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        available: true,
        id: true,
        isDemo: true,
        price: true,
        product: {
          select: {
            name: true,
          },
        },
        store: {
          select: {
            name: true,
          },
        },
        title: true,
        updatedAt: true,
      },
      take: 5,
    });
    const storePreviews = await prisma.store.findMany({
      orderBy: { name: "asc" },
      select: {
        _count: {
          select: {
            offers: true,
          },
        },
        active: true,
        affiliateEnabled: true,
        id: true,
        isDemo: true,
        name: true,
        slug: true,
      },
      take: 8,
    });

    const reportStatusCounts = createReportStatusCounts(reportStatusGroups);

    return {
      counts: {
        affiliateLinks,
        alerts,
        categories,
        clicks,
        offers,
        products,
        providerErrors,
        reports,
        searches,
        stores,
        users,
      },
      products: recentProducts.map((product) => ({
        categoryName: product.category.name,
        id: product.id,
        isDemo: product.isDemo,
        name: product.name,
        offerCount: product._count.offers,
        slug: product.slug,
        updatedAt: product.updatedAt,
      })),
      offers: recentOffers.map((offer) => ({
        available: offer.available,
        id: offer.id,
        isDemo: offer.isDemo,
        price: offer.price.toString(),
        productName: offer.product.name,
        storeName: offer.store.name,
        title: offer.title,
        updatedAt: offer.updatedAt,
      })),
      popularSearches: getPopularSearches(recentSearchLogs),
      providerErrors: recentProviderErrors,
      recentReports: recentReports.map((report) => ({
        createdAt: report.createdAt,
        id: report.id,
        message: report.message,
        offerTitle: report.offer?.title ?? null,
        productName: report.product?.name ?? null,
        reason: report.reason,
        status: report.status,
      })),
      reportStatusCounts,
      stores: storePreviews.map((store) => ({
        active: store.active,
        affiliateEnabled: store.affiliateEnabled,
        id: store.id,
        isDemo: store.isDemo,
        name: store.name,
        offerCount: store._count.offers,
        slug: store.slug,
      })),
      status: "ready",
    };
  } catch (error) {
    logger.error("Unable to load admin overview.", { error });
    return {
      counts: emptyCounts,
      products: [],
      offers: [],
      popularSearches: [],
      providerErrors: [],
      recentReports: [],
      reportStatusCounts: createEmptyReportStatusCounts(),
      stores: [],
      reason: "No pudimos cargar el panel admin por un error inesperado.",
      status: "error",
    };
  }
}

export async function listAdminReports(
  statusFilter: string,
): Promise<AdminReportList> {
  const prisma = getPrismaClient();
  const selectedStatus = isAdminReportStatus(statusFilter) ? statusFilter : null;

  if (!prisma) {
    return {
      reason: missingDatabaseReason,
      reportStatusCounts: createEmptyReportStatusCounts(),
      reports: [],
      selectedStatus,
      status: "database_unavailable",
      totalCount: 0,
    };
  }

  try {
    const reportStatusGroups = await prisma.productReport.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    });
    const reportStatusCounts = createReportStatusCounts(reportStatusGroups);
    const where = selectedStatus ? { status: selectedStatus } : {};
    const totalCount = await prisma.productReport.count({ where });
    const reports = await prisma.productReport.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        id: true,
        message: true,
        offer: {
          select: {
            title: true,
          },
        },
        product: {
          select: {
            name: true,
          },
        },
        reason: true,
        status: true,
        updatedAt: true,
        user: {
          select: {
            email: true,
          },
        },
      },
      take: 50,
      where,
    });

    return {
      reportStatusCounts,
      reports: reports.map((report) => ({
        createdAt: report.createdAt,
        id: report.id,
        message: report.message,
        offerTitle: report.offer?.title ?? null,
        productName: report.product?.name ?? null,
        reason: report.reason,
        status: report.status,
        updatedAt: report.updatedAt,
        userEmail: report.user?.email ?? null,
      })),
      selectedStatus,
      status: "ready",
      totalCount,
    };
  } catch (error) {
    logger.error("Unable to list admin reports.", { error });
    return {
      reason: "No pudimos cargar los reportes por un error inesperado.",
      reportStatusCounts: createEmptyReportStatusCounts(),
      reports: [],
      selectedStatus,
      status: "error",
      totalCount: 0,
    };
  }
}

export async function getAdminReportDetail(
  reportId: string,
): Promise<AdminReportDetail> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return {
      reason: missingDatabaseReason,
      status: "database_unavailable",
    };
  }

  try {
    const report = await prisma.productReport.findUnique({
      where: { id: reportId },
      select: {
        createdAt: true,
        id: true,
        message: true,
        offer: {
          select: {
            price: true,
            productUrl: true,
            store: {
              select: {
                name: true,
              },
            },
            title: true,
          },
        },
        product: {
          select: {
            name: true,
            slug: true,
          },
        },
        reason: true,
        status: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!report) {
      return {
        reason: "No encontramos el reporte solicitado.",
        status: "not_found",
      };
    }

    return {
      report: {
        createdAt: report.createdAt,
        id: report.id,
        message: report.message,
        offer: report.offer
          ? {
              price: report.offer.price.toString(),
              productUrl: report.offer.productUrl,
              storeName: report.offer.store.name,
              title: report.offer.title,
            }
          : null,
        product: report.product
          ? {
              name: report.product.name,
              slug: report.product.slug,
            }
          : null,
        reason: report.reason,
        status: report.status,
        userEmail: report.user?.email ?? null,
      },
      status: "ready",
    };
  } catch (error) {
    logger.error("Unable to load admin report detail.", { error });
    return {
      reason: "No pudimos cargar el reporte por un error inesperado.",
      status: "error",
    };
  }
}

export async function updateAdminReportStatus(
  reportId: string,
  status: string,
): Promise<UpdateAdminReportStatusResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", reason: missingDatabaseReason };
  }

  if (!reportId || !isAdminReportStatus(status)) {
    return { status: "invalid" };
  }

  try {
    const result = await prisma.productReport.updateMany({
      data: { status },
      where: { id: reportId },
    });

    return result.count > 0
      ? { reportStatus: status, status: "updated" }
      : { status: "not_found" };
  } catch (error) {
    logger.error("Unable to update admin report status.", { error });
    return { status: "error" };
  }
}
