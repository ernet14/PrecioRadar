import { getPrismaClient } from "@/lib/prisma";

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
  status: string;
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
        status: string;
        userEmail: string | null;
      };
      status: "ready";
    }
  | { reason: string; status: "database_unavailable" | "error" | "not_found" };

export type AdminOverview =
  | {
      counts: AdminCounts;
      popularSearches: AdminPopularSearch[];
      providerErrors: AdminProviderError[];
      recentReports: AdminRecentReport[];
      status: "ready";
    }
  | {
      counts: AdminCounts;
      popularSearches: [];
      providerErrors: [];
      recentReports: [];
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
      popularSearches: [],
      providerErrors: [],
      recentReports: [],
      reason: missingDatabaseReason,
      status: "database_unavailable",
    };
  }

  try {
    const [
      products,
      offers,
      stores,
      categories,
      users,
      searches,
      clicks,
      alerts,
      reports,
      affiliateLinks,
      providerErrors,
      recentSearchLogs,
      recentProviderErrors,
      recentReports,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.productOffer.count(),
      prisma.store.count(),
      prisma.category.count(),
      prisma.user.count(),
      prisma.searchLog.count(),
      prisma.clickTracking.count(),
      prisma.alert.count(),
      prisma.productReport.count(),
      prisma.affiliateLink.count(),
      prisma.providerLog.count({
        where: {
          status: {
            notIn: ["ok", "ready", "success"],
          },
        },
      }),
      prisma.searchLog.findMany({
        orderBy: { createdAt: "desc" },
        select: { query: true },
        take: 100,
      }),
      prisma.providerLog.findMany({
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
      }),
      prisma.productReport.findMany({
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
      }),
    ]);

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
      status: "ready",
    };
  } catch (error) {
    console.error("Unable to load admin overview.", error);
    return {
      counts: emptyCounts,
      popularSearches: [],
      providerErrors: [],
      recentReports: [],
      reason: "No pudimos cargar el panel admin por un error inesperado.",
      status: "error",
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
    console.error("Unable to load admin report detail.", error);
    return {
      reason: "No pudimos cargar el reporte por un error inesperado.",
      status: "error",
    };
  }
}
