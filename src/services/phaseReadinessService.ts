import { mvpCategoryDescriptors } from "@/data/categories";
import { getPrismaClient } from "@/lib/prisma";
import {
  type DataRadarRunResult,
  type DataRadarScopeResult,
} from "@/services/dataRadarService";
import {
  computePriceIndex,
  type PriceIndexResult,
} from "@/services/priceIndexService";
import {
  getIndexableBrandCategoryPages,
  getIndexableProductSlugs,
} from "@/services/productService";

const MIN_PUBLIC_DAYS = 30;
const MIN_PUBLIC_PRODUCTS = 30;
const MIN_LATEST_SAMPLE = 20;

export type Phase3ScopeReadiness = {
  categorySlug: string | null;
  days: number;
  label: string;
  latestDate: string | null;
  latestSample: number;
  missing: string[];
  productsTracked: number;
  publicable: boolean;
  status: "publicable" | "building" | "no_data";
};

export type Phase3ReadinessReport = {
  brandCategoryPages: number;
  comparableProducts: number;
  comparableRate: number;
  generatedAt: string;
  indexableProducts: number;
  nextActions: string[];
  publicableScopes: number;
  scopes: Phase3ScopeReadiness[];
  status: "ready" | "partial" | "building" | "no_data";
};

export type Phase3ReadinessPersistence =
  | { status: "stored"; systemHealthLogId: string }
  | { status: "database_unavailable" }
  | { reason: string; status: "error" };

export type LatestPhase3ReadinessReport = {
  createdAt: Date;
  report: Phase3ReadinessReport | null;
  status: string;
  summary: string;
};

function latestSample(index: PriceIndexResult) {
  return index.points.at(-1)?.sampleSize ?? 0;
}

function assessScope(label: string, categorySlug: string | null, index: PriceIndexResult): Phase3ScopeReadiness {
  const sample = latestSample(index);
  const missing: string[] = [];
  if (index.days < MIN_PUBLIC_DAYS) missing.push(`${MIN_PUBLIC_DAYS - index.days} días de historia`);
  if (index.productsTracked < MIN_PUBLIC_PRODUCTS) {
    missing.push(`${MIN_PUBLIC_PRODUCTS - index.productsTracked} productos`);
  }
  if (sample < MIN_LATEST_SAMPLE) missing.push(`${MIN_LATEST_SAMPLE - sample} productos en sample latest`);

  const publicable = missing.length === 0;
  const hasData = index.days > 0 && index.productsTracked > 0;

  return {
    categorySlug,
    days: index.days,
    label,
    latestDate: index.latestDate,
    latestSample: sample,
    missing,
    productsTracked: index.productsTracked,
    publicable,
    status: publicable ? "publicable" : hasData ? "building" : "no_data",
  };
}

function getOverallStatus(scopes: Phase3ScopeReadiness[]): Phase3ReadinessReport["status"] {
  const total = scopes.find((scope) => scope.label === "total");
  if (total?.publicable) return "ready";
  if (scopes.some((scope) => scope.publicable)) return "partial";
  if (scopes.some((scope) => scope.status === "building")) return "building";
  return "no_data";
}

function buildNextActions(report: Omit<Phase3ReadinessReport, "nextActions">) {
  const actions: string[] = [];
  const total = report.scopes.find((scope) => scope.label === "total");
  const nearScopes = report.scopes
    .filter((scope) => !scope.publicable && scope.status === "building")
    .filter((scope) => scope.days >= 20 && scope.productsTracked >= MIN_PUBLIC_PRODUCTS && scope.latestSample >= MIN_LATEST_SAMPLE)
    .map((scope) => scope.label);

  if (report.status === "ready") {
    actions.push("Preparar publicación del índice total y QA de copy legal/no engañoso.");
  } else if (total) {
    actions.push(`Esperar serie: total ${total.days}/${MIN_PUBLIC_DAYS} días.`);
  }

  if (nearScopes.length > 0) {
    actions.push(`Preparar landing pública para scopes casi maduros: ${nearScopes.join(", ")}.`);
  }

  if (report.comparableRate < 45) {
    actions.push("Seguir densificando modelos VTEX de alto solape; objetivo operativo siguiente: 45% comparables.");
  }

  if (report.brandCategoryPages < 10) {
    actions.push("Ampliar long-tail SEO por marca/categoría cuando haya más productos reales por marca.");
  }

  if (actions.length === 0) {
    actions.push("Mantener cron diario y revisar Search Console/sitemap.");
  }

  return actions;
}

async function getScopeInputs(run?: DataRadarRunResult): Promise<DataRadarScopeResult[]> {
  if (run) return run.scopes;

  const scopes = [
    { categorySlug: null, label: "total" },
    ...mvpCategoryDescriptors.map((descriptor) => ({
      categorySlug: descriptor.slug,
      label: descriptor.slug,
    })),
  ];

  return Promise.all(
    scopes.map(async (scope) => ({
      ...scope,
      index: await computePriceIndex({ categorySlug: scope.categorySlug }),
      radar: null,
    })),
  );
}

export async function buildPhase3ReadinessReport(
  run?: DataRadarRunResult,
): Promise<Phase3ReadinessReport> {
  const [scopesInput, indexableProducts, brandCategoryPages] = await Promise.all([
    getScopeInputs(run),
    getIndexableProductSlugs(),
    getIndexableBrandCategoryPages(),
  ]);
  const comparableProducts = indexableProducts.filter((product) => product.comparable).length;
  const comparableRate =
    indexableProducts.length > 0
      ? Math.round((comparableProducts / indexableProducts.length) * 100)
      : 0;
  const scopes = scopesInput.map((scope) =>
    assessScope(scope.label, scope.categorySlug, scope.index),
  );
  const baseReport = {
    brandCategoryPages: brandCategoryPages.length,
    comparableProducts,
    comparableRate,
    generatedAt: new Date().toISOString(),
    indexableProducts: indexableProducts.length,
    publicableScopes: scopes.filter((scope) => scope.publicable).length,
    scopes,
    status: getOverallStatus(scopes),
  };

  return {
    ...baseReport,
    nextActions: buildNextActions(baseReport),
  };
}

function toHealthStatus(status: Phase3ReadinessReport["status"]) {
  if (status === "ready") return "ok";
  if (status === "partial" || status === "building") return "warn";
  return "fail";
}

function summarize(report: Phase3ReadinessReport) {
  const total = report.scopes.find((scope) => scope.label === "total");
  const totalText = total
    ? `total ${total.days}/${MIN_PUBLIC_DAYS} días, ${total.productsTracked} productos, sample ${total.latestSample}`
    : "sin scope total";

  return `Fase 3 ${report.status}: ${totalText}. Comparables ${report.comparableProducts}/${report.indexableProducts} (${report.comparableRate}%). Long-tail marca/categoría: ${report.brandCategoryPages}.`;
}

export async function persistPhase3ReadinessReport(
  report: Phase3ReadinessReport,
): Promise<Phase3ReadinessPersistence> {
  const prisma = getPrismaClient();
  if (!prisma) return { status: "database_unavailable" };

  try {
    const data = {
      actionsTaken: ["phase_3_readiness_evaluated"],
      detectedErrors: report.scopes
        .filter((scope) => !scope.publicable)
        .map((scope) => ({
          missing: scope.missing,
          scope: scope.label,
          status: scope.status,
        })),
      metrics: report,
      recommendations: report.nextActions.join(" "),
      reportType: "phase-3-readiness",
      status: toHealthStatus(report.status),
      summary: summarize(report),
    };
    const dedupeKey = `phase-3-readiness:${report.generatedAt.slice(0, 10)}`;
    const existing = await prisma.systemHealthLog.findFirst({
      orderBy: { createdAt: "desc" },
      where: { dedupeKey },
    });
    const log = existing
      ? await prisma.systemHealthLog.update({
          data: { ...data, dedupeKey },
          where: { id: existing.id },
        })
      : await prisma.systemHealthLog.create({
          data: {
            ...data,
            dedupeKey,
          },
        });

    return { status: "stored", systemHealthLogId: log.id };
  } catch (error) {
    return {
      reason: error instanceof Error ? error.message : "Unknown error",
      status: "error",
    };
  }
}

function isPhase3ReadinessReport(value: unknown): value is Phase3ReadinessReport {
  if (!value || typeof value !== "object") return false;
  return "generatedAt" in value && "scopes" in value && "status" in value;
}

export async function getLatestPhase3ReadinessReport(): Promise<LatestPhase3ReadinessReport | null> {
  const prisma = getPrismaClient();
  if (!prisma) return null;

  try {
    const log = await prisma.systemHealthLog.findFirst({
      orderBy: { createdAt: "desc" },
      where: { reportType: "phase-3-readiness" },
    });
    if (!log) return null;

    return {
      createdAt: log.createdAt,
      report: isPhase3ReadinessReport(log.metrics) ? log.metrics : null,
      status: log.status,
      summary: log.summary,
    };
  } catch {
    return null;
  }
}
