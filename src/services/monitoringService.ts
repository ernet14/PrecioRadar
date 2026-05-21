import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/seo/site";
import { sendSystemEmail } from "@/services/emailService";

// Bot de monitoreo de PrecioRadar.
//  - runDailyReport(): Nivel 1, resumen diario por email.
//  - runHealthWatch(): Niveles 2-4, chequeo periódico + auto-reparación segura
//    + alerta inmediata de excepciones críticas (con anti-spam).
// Nunca borra datos, no toca env ni migraciones. La única acción automática es
// bloquear temporalmente una tienda con 403 repetidos (Store.blockedUntil), que
// expira sola.

type Prisma = NonNullable<ReturnType<typeof getPrismaClient>>;

type Severity = "ok" | "warn" | "fail" | "critical";

const SEVERITY_ORDER: Record<Severity, number> = { ok: 0, warn: 1, fail: 2, critical: 3 };

type Issue = {
  key: string; // base de dedupe, p. ej. "db_saturated" o "provider_403:fravega"
  area: string;
  severity: Severity;
  title: string;
  detail: string;
  providerSlug?: string;
};

const SUCCESS_STATUSES = new Set(["ok", "ready", "success"]);
const SATURATION_PATTERNS = [
  /max clients reached/i,
  /emaxconnsession/i,
  /too many connections/i,
  /pool timeout/i,
  /timed out fetching a connection/i,
  /connection pool/i,
];

function getNum(key: string, fallback: number) {
  const parsed = Number.parseInt(process.env[key] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const PROVIDER_ERROR_WINDOW_MIN = getNum("MONITOR_PROVIDER_WINDOW_MIN", 60);
const PROVIDER_ERROR_WARN = getNum("MONITOR_PROVIDER_WARN", 10);
const PROVIDER_ERROR_FAIL = getNum("MONITOR_PROVIDER_FAIL", 25);
const PROVIDER_403_THRESHOLD = getNum("MONITOR_PROVIDER_403", 5);
const PRICES_STALE_HOURS = getNum("MONITOR_PRICES_STALE_HOURS", 36);
const OFFER_STALE_HOURS = getNum("MONITOR_OFFER_STALE_HOURS", 48);
const SCRAPEJOB_STUCK_MIN = getNum("MONITOR_SCRAPEJOB_STUCK_MIN", 45);
const DEDUP_WINDOW_MIN = getNum("ALERT_DEDUP_WINDOW_MINUTES", 180);
const AUTO_BLOCK_HOURS = getNum("MONITOR_AUTO_BLOCK_HOURS", 6);

function maxSeverity(severities: Severity[]): Severity {
  return severities.reduce<Severity>(
    (worst, current) => (SEVERITY_ORDER[current] > SEVERITY_ORDER[worst] ? current : worst),
    "ok",
  );
}

async function fetchStatus(url: string, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    const text = response.ok ? await response.text().catch(() => "") : "";
    return { ok: response.ok, httpStatus: response.status, text };
  } catch (error) {
    return {
      ok: false,
      httpStatus: null as number | null,
      text: "",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Chequeos (compartidos por daily-report y health-watch)
// ---------------------------------------------------------------------------

export type CheckSnapshots = {
  db: { ok: boolean; latencyMs: number | null; error?: string };
  web: { ok: boolean; httpStatus: number | null };
  sitemap: { ok: boolean; httpStatus: number | null; urlCount: number | null };
};

async function checkDatabase(prisma: Prisma): Promise<{ issue: Issue | null; snapshot: CheckSnapshots["db"] }> {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { issue: null, snapshot: { ok: true, latencyMs: Date.now() - startedAt } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const saturated = SATURATION_PATTERNS.some((pattern) => pattern.test(message));
    return {
      snapshot: { ok: false, latencyMs: null, error: message },
      issue: {
        key: saturated ? "db_saturated" : "db_down",
        area: "database",
        severity: "critical",
        title: saturated ? "Conexiones a la base de datos saturadas" : "Base de datos sin conexión",
        detail: message.slice(0, 300),
      },
    };
  }
}

async function checkWeb(): Promise<{ issue: Issue | null; snapshot: CheckSnapshots["web"] }> {
  const result = await fetchStatus(getSiteUrl());
  if (result.ok) {
    return { issue: null, snapshot: { ok: true, httpStatus: result.httpStatus } };
  }
  return {
    snapshot: { ok: false, httpStatus: result.httpStatus },
    issue: {
      key: "web_down",
      area: "web",
      severity: "critical",
      title: "La web no responde correctamente",
      detail: `Healthcheck HTTP devolvió ${result.httpStatus ?? "sin respuesta"}.`,
    },
  };
}

async function checkSitemap(): Promise<{ issue: Issue | null; snapshot: CheckSnapshots["sitemap"] }> {
  const result = await fetchStatus(`${getSiteUrl()}/sitemap.xml`);
  const urlCount = result.ok ? (result.text.match(/<url>/g)?.length ?? null) : null;
  if (result.ok) {
    return { issue: null, snapshot: { ok: true, httpStatus: result.httpStatus, urlCount } };
  }
  return {
    snapshot: { ok: false, httpStatus: result.httpStatus, urlCount: null },
    issue: {
      key: "sitemap_down",
      area: "sitemap",
      severity: "fail",
      title: "Sitemap caído",
      detail: `El sitemap devolvió ${result.httpStatus ?? "sin respuesta"} (esperado 200).`,
    },
  };
}

type ProviderErrorRow = { provider: string; errorMessage: string | null };

async function checkProviders(prisma: Prisma): Promise<Issue[]> {
  const since = new Date(Date.now() - PROVIDER_ERROR_WINDOW_MIN * 60_000);
  const rows: ProviderErrorRow[] = await prisma.providerLog.findMany({
    where: { createdAt: { gte: since }, status: { notIn: Array.from(SUCCESS_STATUSES) } },
    select: { provider: true, errorMessage: true },
    take: 500,
  });

  const issues: Issue[] = [];
  if (rows.length === 0) return issues;

  // Errores totales en la ventana.
  if (rows.length >= PROVIDER_ERROR_WARN) {
    issues.push({
      key: "provider_errors",
      area: "providers",
      severity: rows.length >= PROVIDER_ERROR_FAIL ? "fail" : "warn",
      title: "Muchos errores de proveedores",
      detail: `${rows.length} errores de proveedor en los últimos ${PROVIDER_ERROR_WINDOW_MIN} min.`,
    });
  }

  // 403 repetidos por proveedor → excepción crítica + candidato a auto-bloqueo.
  const count403 = new Map<string, number>();
  for (const row of rows) {
    if (row.errorMessage && /\b403\b/.test(row.errorMessage)) {
      count403.set(row.provider, (count403.get(row.provider) ?? 0) + 1);
    }
  }
  for (const [provider, count] of count403) {
    if (count >= PROVIDER_403_THRESHOLD) {
      issues.push({
        key: `provider_403:${provider}`,
        area: "providers",
        severity: "critical",
        title: `Proveedor "${provider}" devuelve 403 repetidos`,
        detail: `${count} respuestas 403 en ${PROVIDER_ERROR_WINDOW_MIN} min.`,
        providerSlug: provider,
      });
    }
  }

  return issues;
}

async function checkCronAndJobs(prisma: Prisma): Promise<Issue[]> {
  const issues: Issue[] = [];

  // Cron de precios fallando 2 veces seguidas.
  const lastTwo = await prisma.scrapeJob.findMany({
    where: { action: "refreshPrices" },
    orderBy: { startedAt: "desc" },
    select: { status: true, startedAt: true },
    take: 2,
  });
  if (lastTwo.length === 2 && lastTwo.every((job) => job.status === "error")) {
    issues.push({
      key: "cron_failing",
      area: "cron",
      severity: "critical",
      title: "El cron de precios falló 2 veces seguidas",
      detail: "Las dos últimas corridas de refreshPrices terminaron en error.",
    });
  }

  // ScrapeJob trabado en running demasiado tiempo.
  const stuckSince = new Date(Date.now() - SCRAPEJOB_STUCK_MIN * 60_000);
  const stuck = await prisma.scrapeJob.findFirst({
    where: { status: { in: ["running", "pending"] }, startedAt: { lt: stuckSince } },
    orderBy: { startedAt: "asc" },
    select: { id: true, provider: true, startedAt: true },
  });
  if (stuck) {
    const ageMin = Math.round((Date.now() - stuck.startedAt.getTime()) / 60_000);
    issues.push({
      key: "scrapejob_stuck",
      area: "cron",
      severity: "fail",
      title: "ScrapeJob trabado en running",
      detail: `Job ${stuck.id} (${stuck.provider}) lleva ${ageMin} min sin finalizar.`,
    });
  }

  // Precios sin actualizarse hace muchas horas.
  const lastOk = await prisma.scrapeJob.findFirst({
    where: { action: "refreshPrices", status: "completed", finishedAt: { not: null } },
    orderBy: { finishedAt: "desc" },
    select: { finishedAt: true },
  });
  if (!lastOk?.finishedAt) {
    issues.push({
      key: "prices_never_updated",
      area: "cron",
      severity: "warn",
      title: "Sin corridas exitosas de precios",
      detail: "No hay ningún refreshPrices completado registrado.",
    });
  } else {
    const ageHours = (Date.now() - lastOk.finishedAt.getTime()) / 3_600_000;
    if (ageHours > PRICES_STALE_HOURS) {
      issues.push({
        key: "prices_stale",
        area: "cron",
        severity: "fail",
        title: "Precios desactualizados",
        detail: `Última actualización exitosa hace ${Math.round(ageHours)} h (umbral ${PRICES_STALE_HOURS} h).`,
      });
    }
  }

  return issues;
}

async function runChecks(prisma: Prisma): Promise<{ issues: Issue[]; snapshots: CheckSnapshots }> {
  const [db, web, sitemap, providerIssues, cronIssues] = await Promise.all([
    checkDatabase(prisma),
    checkWeb(),
    checkSitemap(),
    checkProviders(prisma),
    checkCronAndJobs(prisma),
  ]);

  const issues = [
    ...(db.issue ? [db.issue] : []),
    ...(web.issue ? [web.issue] : []),
    ...(sitemap.issue ? [sitemap.issue] : []),
    ...providerIssues,
    ...cronIssues,
  ];

  return { issues, snapshots: { db: db.snapshot, web: web.snapshot, sitemap: sitemap.snapshot } };
}

// ---------------------------------------------------------------------------
// Métricas del día
// ---------------------------------------------------------------------------

export type DailyMetrics = {
  totalProducts: number;
  activeProducts: number;
  activeOffers: number;
  productsLast24h: number;
  pricesUpdatedLast24h: number;
  alertsLast24h: number;
  newUsersLast24h: number;
  affiliateClicksLast24h: number;
  productsWithoutImage: number;
  stalePricedOffers: number;
  recentProviderErrors: { provider: string; action: string; errorMessage: string | null; createdAt: Date }[];
  lastScrapeJobs: { provider: string; action: string; status: string; processed: number; errors: number; startedAt: Date }[];
  topErrorProviders: { provider: string; errors: number }[];
};

async function collectDailyMetrics(prisma: Prisma): Promise<DailyMetrics> {
  const since = new Date(Date.now() - 24 * 3_600_000);
  const offerStaleBefore = new Date(Date.now() - OFFER_STALE_HOURS * 3_600_000);

  const [
    totalProducts,
    activeProducts,
    activeOffers,
    productsLast24h,
    pricesUpdatedLast24h,
    alertsLast24h,
    newUsersLast24h,
    affiliateClicksLast24h,
    productsWithoutImage,
    stalePricedOffers,
    recentProviderErrors,
    lastScrapeJobs,
    errorGroups,
  ] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null, isDemo: false } }),
    prisma.product.count({
      where: { deletedAt: null, isDemo: false, offers: { some: { available: true, isDemo: false } } },
    }),
    prisma.productOffer.count({ where: { isDemo: false, available: true } }),
    prisma.product.count({ where: { deletedAt: null, isDemo: false, createdAt: { gte: since } } }),
    prisma.priceHistory.count({ where: { isDemo: false, recordedAt: { gte: since } } }),
    prisma.alert.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: since } } }),
    prisma.clickTracking.count({ where: { isAffiliate: true, clickedAt: { gte: since } } }),
    prisma.product.count({ where: { deletedAt: null, isDemo: false, imageUrl: null } }),
    prisma.productOffer.count({
      where: { isDemo: false, OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: offerStaleBefore } }] },
    }),
    prisma.providerLog.findMany({
      where: { createdAt: { gte: since }, status: { notIn: Array.from(SUCCESS_STATUSES) } },
      orderBy: { createdAt: "desc" },
      select: { provider: true, action: true, errorMessage: true, createdAt: true },
      take: 10,
    }),
    prisma.scrapeJob.findMany({
      orderBy: { startedAt: "desc" },
      select: { provider: true, action: true, status: true, processed: true, errors: true, startedAt: true },
      take: 5,
    }),
    prisma.providerLog.groupBy({
      by: ["provider"],
      where: { createdAt: { gte: since }, status: { notIn: Array.from(SUCCESS_STATUSES) } },
      _count: { _all: true },
    }),
  ]);

  const topErrorProviders = errorGroups
    .map((group) => ({ provider: group.provider, errors: group._count._all }))
    .filter((entry) => entry.errors > 0)
    .sort((a, b) => b.errors - a.errors)
    .slice(0, 5);

  return {
    totalProducts,
    activeProducts,
    activeOffers,
    productsLast24h,
    pricesUpdatedLast24h,
    alertsLast24h,
    newUsersLast24h,
    affiliateClicksLast24h,
    productsWithoutImage,
    stalePricedOffers,
    recentProviderErrors,
    lastScrapeJobs,
    topErrorProviders,
  };
}

// ---------------------------------------------------------------------------
// Auto-reparación segura
// ---------------------------------------------------------------------------

type Action = { type: string; target: string; detail: string };

async function applySafeActions(prisma: Prisma, issues: Issue[]): Promise<Action[]> {
  const actions: Action[] = [];
  const blockUntil = new Date(Date.now() + AUTO_BLOCK_HOURS * 3_600_000);

  for (const issue of issues) {
    if (!issue.providerSlug || !issue.key.startsWith("provider_403:")) continue;

    try {
      const store = await prisma.store.findUnique({
        where: { slug: issue.providerSlug },
        select: { id: true, blockedUntil: true },
      });
      if (!store) continue;
      // No re-bloquear si ya está bloqueado vigente.
      if (store.blockedUntil && store.blockedUntil > new Date()) continue;

      await prisma.store.update({
        where: { id: store.id },
        data: { blockedUntil: blockUntil, blockReason: `403 repetidos (auto-bloqueo del monitor).` },
      });
      actions.push({
        type: "block_store",
        target: issue.providerSlug,
        detail: `Tienda bloqueada hasta ${blockUntil.toISOString()} por 403 repetidos.`,
      });
    } catch (error) {
      logger.error("Auto-block failed.", { error, route: "monitoringService.applySafeActions" });
    }
  }

  return actions;
}

// ---------------------------------------------------------------------------
// Persistencia + anti-spam
// ---------------------------------------------------------------------------

async function logHealth(
  prisma: Prisma,
  data: {
    reportType: string;
    status: Severity;
    summary: string;
    metrics?: unknown;
    detectedErrors?: unknown;
    actionsTaken?: unknown;
    recommendations?: string | null;
    dedupeKey?: string | null;
    emailSent: boolean;
  },
) {
  try {
    await prisma.systemHealthLog.create({
      data: {
        reportType: data.reportType,
        status: data.status,
        summary: data.summary.slice(0, 1000),
        metrics: (data.metrics ?? undefined) as never,
        detectedErrors: (data.detectedErrors ?? undefined) as never,
        actionsTaken: (data.actionsTaken ?? undefined) as never,
        recommendations: data.recommendations ?? null,
        dedupeKey: data.dedupeKey ?? null,
        emailSent: data.emailSent,
      },
    });
  } catch (error) {
    logger.error("Unable to write SystemHealthLog.", { error, route: "monitoringService.logHealth" });
  }
}

// ¿Ya avisamos de este mismo conjunto de problemas dentro de la ventana?
async function wasRecentlyAlerted(prisma: Prisma, dedupeKey: string): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_WINDOW_MIN * 60_000);
  try {
    const existing = await prisma.systemHealthLog.findFirst({
      where: { dedupeKey, emailSent: true, createdAt: { gte: since } },
      select: { id: true },
    });
    return existing !== null;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Formato de emails
// ---------------------------------------------------------------------------

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const SEVERITY_LABEL: Record<Severity, string> = {
  ok: "OK",
  warn: "Advertencia",
  fail: "Falla",
  critical: "Crítico",
};

function metricsRows(m: DailyMetrics): [string, string][] {
  return [
    ["Productos totales", String(m.totalProducts)],
    ["Productos activos", String(m.activeProducts)],
    ["Ofertas activas", String(m.activeOffers)],
    ["Productos nuevos (24h)", String(m.productsLast24h)],
    ["Precios actualizados (24h)", String(m.pricesUpdatedLast24h)],
    ["Alertas creadas (24h)", String(m.alertsLast24h)],
    ["Usuarios nuevos (24h)", String(m.newUsersLast24h)],
    ["Clicks afiliados (24h)", String(m.affiliateClicksLast24h)],
    ["Productos sin imagen", String(m.productsWithoutImage)],
    [`Ofertas sin actualizar (+${OFFER_STALE_HOURS}h)`, String(m.stalePricedOffers)],
  ];
}

function buildDailyEmail(args: {
  status: Severity;
  snapshots: CheckSnapshots;
  metrics: DailyMetrics;
  issues: Issue[];
  actions: Action[];
  recommendations: string[];
}) {
  const { status, snapshots, metrics, issues, actions, recommendations } = args;
  const rows = metricsRows(metrics);

  const html = `
  <div style="font-family: Arial, sans-serif; color:#0f172a; line-height:1.5; max-width:640px;">
    <h1 style="font-size:20px; margin:0 0 4px;">PrecioRadar · Reporte diario</h1>
    <p style="margin:0 0 16px; color:#64748b;">${esc(new Date().toLocaleString("es-AR"))}</p>

    <h2 style="font-size:15px; margin:16px 0 8px;">Resumen general</h2>
    <p style="margin:0 0 8px;">Estado: <strong>${SEVERITY_LABEL[status]}</strong></p>
    <ul style="margin:0 0 8px; padding-left:18px;">
      <li>Web: ${snapshots.web.ok ? "OK" : `caída (${snapshots.web.httpStatus ?? "s/r"})`}</li>
      <li>Base de datos: ${snapshots.db.ok ? `OK (${snapshots.db.latencyMs} ms)` : "sin conexión"}</li>
      <li>Sitemap: ${snapshots.sitemap.ok ? `OK (${snapshots.sitemap.urlCount ?? "?"} urls)` : `caído (${snapshots.sitemap.httpStatus ?? "s/r"})`}</li>
    </ul>

    <h2 style="font-size:15px; margin:16px 0 8px;">Métricas del día</h2>
    <table style="border-collapse:collapse; width:100%;">
      ${rows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:4px 0; color:#475569;">${esc(label)}</td><td style="padding:4px 0; text-align:right; font-weight:700;">${esc(value)}</td></tr>`,
        )
        .join("")}
    </table>

    <h2 style="font-size:15px; margin:16px 0 8px;">Errores detectados</h2>
    ${
      issues.length === 0
        ? `<p style="margin:0; color:#16a34a;">Sin problemas detectados.</p>`
        : `<ul style="margin:0; padding-left:18px;">${issues
            .map((i) => `<li><strong>[${SEVERITY_LABEL[i.severity]}]</strong> ${esc(i.title)} — ${esc(i.detail)}</li>`)
            .join("")}</ul>`
    }
    ${
      metrics.topErrorProviders.length > 0
        ? `<p style="margin:8px 0 0; color:#64748b;">Proveedores con más errores (24h): ${metrics.topErrorProviders
            .map((p) => `${esc(p.provider)} (${p.errors})`)
            .join(", ")}</p>`
        : ""
    }

    <h2 style="font-size:15px; margin:16px 0 8px;">Acciones automáticas</h2>
    ${
      actions.length === 0
        ? `<p style="margin:0; color:#64748b;">Ninguna.</p>`
        : `<ul style="margin:0; padding-left:18px;">${actions
            .map((a) => `<li>${esc(a.type)} · ${esc(a.target)} — ${esc(a.detail)}</li>`)
            .join("")}</ul>`
    }

    <h2 style="font-size:15px; margin:16px 0 8px;">Recomendaciones</h2>
    ${
      recommendations.length === 0
        ? `<p style="margin:0; color:#64748b;">Sin acciones manuales pendientes.</p>`
        : `<ul style="margin:0; padding-left:18px;">${recommendations.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`
    }
  </div>`;

  const text = [
    "PrecioRadar · Reporte diario",
    new Date().toISOString(),
    "",
    `Estado general: ${SEVERITY_LABEL[status]}`,
    `Web: ${snapshots.web.ok ? "OK" : "CAÍDA"} | DB: ${snapshots.db.ok ? "OK" : "SIN CONEXIÓN"} | Sitemap: ${snapshots.sitemap.ok ? "OK" : "CAÍDO"}`,
    "",
    "Métricas:",
    ...rows.map(([label, value]) => `- ${label}: ${value}`),
    "",
    "Errores:",
    ...(issues.length ? issues.map((i) => `- [${i.severity}] ${i.title}: ${i.detail}`) : ["- Sin problemas."]),
    "",
    "Acciones automáticas:",
    ...(actions.length ? actions.map((a) => `- ${a.type} ${a.target}: ${a.detail}`) : ["- Ninguna."]),
    "",
    "Recomendaciones:",
    ...(recommendations.length ? recommendations.map((r) => `- ${r}`) : ["- Sin pendientes."]),
  ].join("\n");

  return { html, text };
}

function buildAlertEmail(args: { status: Severity; issues: Issue[]; actions: Action[]; when: Date }) {
  const { status, issues, actions, when } = args;
  const areas = Array.from(new Set(issues.map((i) => i.area))).join(", ");
  const recs = buildRecommendations(issues);

  const html = `
  <div style="font-family: Arial, sans-serif; color:#0f172a; line-height:1.5; max-width:640px;">
    <h1 style="font-size:19px; margin:0 0 8px; color:#b91c1c;">⚠ PrecioRadar · Alerta ${SEVERITY_LABEL[status]}</h1>
    <p style="margin:0 0 4px;"><strong>Qué pasó:</strong></p>
    <ul style="margin:0 0 8px; padding-left:18px;">
      ${issues.map((i) => `<li>${esc(i.title)} — ${esc(i.detail)}</li>`).join("")}
    </ul>
    <p style="margin:0 0 4px;"><strong>Cuándo:</strong> ${esc(when.toLocaleString("es-AR"))}</p>
    <p style="margin:0 0 4px;"><strong>Qué afecta:</strong> ${esc(areas)}</p>
    <p style="margin:0 0 4px;"><strong>Gravedad:</strong> ${SEVERITY_LABEL[status]}</p>
    <p style="margin:8px 0 4px;"><strong>Acción automática del sistema:</strong></p>
    ${
      actions.length
        ? `<ul style="margin:0 0 8px; padding-left:18px;">${actions.map((a) => `<li>${esc(a.detail)}</li>`).join("")}</ul>`
        : `<p style="margin:0 0 8px; color:#64748b;">Ninguna (solo reporte).</p>`
    }
    <p style="margin:0 0 4px;"><strong>Qué revisar:</strong></p>
    <ul style="margin:0; padding-left:18px;">${recs.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
  </div>`;

  const text = [
    `PrecioRadar · ALERTA ${SEVERITY_LABEL[status]}`,
    "",
    "Qué pasó:",
    ...issues.map((i) => `- ${i.title}: ${i.detail}`),
    "",
    `Cuándo: ${when.toISOString()}`,
    `Qué afecta: ${areas}`,
    `Gravedad: ${SEVERITY_LABEL[status]}`,
    "",
    "Acción automática:",
    ...(actions.length ? actions.map((a) => `- ${a.detail}`) : ["- Ninguna."]),
    "",
    "Qué revisar:",
    ...recs.map((r) => `- ${r}`),
  ].join("\n");

  return { html, text };
}

function buildRecommendations(issues: Issue[]): string[] {
  const recs = new Set<string>();
  for (const issue of issues) {
    switch (issue.key) {
      case "db_saturated":
        recs.add("Revisar el pooler de Supabase (usar transaction pooler 6543) y DATABASE_POOL_MAX.");
        break;
      case "db_down":
        recs.add("Verificar credenciales y estado del proyecto Supabase.");
        break;
      case "web_down":
        recs.add("Revisar el último deploy en Vercel y los logs de runtime.");
        break;
      case "sitemap_down":
        recs.add("Revisar la generación del sitemap y el build.");
        break;
      case "cron_failing":
        recs.add("Revisar logs del cron refresh-prices y la conexión a la DB.");
        break;
      case "prices_stale":
      case "prices_never_updated":
        recs.add("Confirmar que el cron de precios esté corriendo en Vercel.");
        break;
      case "scrapejob_stuck":
        recs.add("Revisar el ScrapeJob trabado; puede haber timeout de provider o DB.");
        break;
      default:
        if (issue.key.startsWith("provider_403:")) {
          recs.add(`Verificar la API del proveedor ${issue.providerSlug}; el monitor lo bloqueó temporalmente.`);
        } else if (issue.key === "provider_errors") {
          recs.add("Revisar ProviderLog: posible cambio de API o bloqueo de un proveedor.");
        }
    }
  }
  if (recs.size === 0) recs.add("Sin acciones manuales urgentes.");
  return Array.from(recs);
}

// ---------------------------------------------------------------------------
// Entradas públicas
// ---------------------------------------------------------------------------

export type MonitoringResult = {
  status: Severity | "database_unavailable" | "error";
  emailStatus?: string;
  issues?: number;
  actions?: number;
  suppressed?: boolean;
};

export async function runDailyReport(): Promise<MonitoringResult> {
  const prisma = getPrismaClient();
  if (!prisma) return { status: "database_unavailable" };

  try {
    const [{ issues, snapshots }, metrics] = await Promise.all([
      runChecks(prisma),
      collectDailyMetrics(prisma),
    ]);

    const actions = await applySafeActions(prisma, issues);
    const status = maxSeverity(issues.map((i) => i.severity));
    const recommendations = issues.length ? buildRecommendations(issues) : [];

    const { html, text } = buildDailyEmail({ status, snapshots, metrics, issues, actions, recommendations });
    const email = await sendSystemEmail({
      subject: `PrecioRadar · Reporte diario [${SEVERITY_LABEL[status]}]`,
      html,
      text,
      idempotencyKey: `daily-${new Date().toISOString().slice(0, 10)}`,
    });

    await logHealth(prisma, {
      reportType: "daily",
      status,
      summary: `Reporte diario (${SEVERITY_LABEL[status]}): ${issues.length} problemas, ${actions.length} acciones.`,
      metrics: metrics as unknown,
      detectedErrors: issues,
      actionsTaken: actions,
      recommendations: recommendations.join(" | ") || null,
      emailSent: email.status === "sent",
    });

    if (email.status === "failed") {
      logger.error("Daily report email failed.", { error: email.error, route: "monitoringService.runDailyReport" });
    }

    return { status, emailStatus: email.status, issues: issues.length, actions: actions.length };
  } catch (error) {
    logger.error("Daily report failed.", { error, route: "monitoringService.runDailyReport" });
    return { status: "error" };
  }
}

export async function runHealthWatch(): Promise<MonitoringResult> {
  const prisma = getPrismaClient();
  if (!prisma) {
    // La DB caída es justamente una excepción crítica: avisamos igual.
    const when = new Date();
    const issue: Issue = {
      key: "db_down",
      area: "database",
      severity: "critical",
      title: "Base de datos no configurada / sin conexión",
      detail: "getPrismaClient() devolvió null o falta DATABASE_URL.",
    };
    const { html, text } = buildAlertEmail({ status: "critical", issues: [issue], actions: [], when });
    await sendSystemEmail({ subject: "PrecioRadar · ALERTA Crítico (DB)", html, text });
    return { status: "database_unavailable", emailStatus: "attempted" };
  }

  try {
    const { issues } = await runChecks(prisma);
    const critical = issues.filter((i) => SEVERITY_ORDER[i.severity] >= SEVERITY_ORDER.fail);

    // Acciones seguras (se aplican aunque el email se deduplique).
    const actions = await applySafeActions(prisma, issues);

    if (critical.length === 0) {
      await logHealth(prisma, {
        reportType: "health-watch",
        status: maxSeverity(issues.map((i) => i.severity)),
        summary: `Health-watch OK: ${issues.length} avisos menores, ${actions.length} acciones.`,
        detectedErrors: issues,
        actionsTaken: actions,
        emailSent: false,
      });
      return { status: maxSeverity(issues.map((i) => i.severity)) || "ok", issues: issues.length, actions: actions.length };
    }

    const status = maxSeverity(critical.map((i) => i.severity));
    const dedupeKey = critical.map((i) => i.key).sort().join("|");
    const alreadyAlerted = await wasRecentlyAlerted(prisma, dedupeKey);

    let emailStatus = "suppressed";
    if (!alreadyAlerted) {
      const { html, text } = buildAlertEmail({ status, issues: critical, actions, when: new Date() });
      const email = await sendSystemEmail({
        subject: `PrecioRadar · ALERTA ${SEVERITY_LABEL[status]}`,
        html,
        text,
      });
      emailStatus = email.status;
      if (email.status === "failed") {
        logger.error("Critical alert email failed.", { error: email.error, route: "monitoringService.runHealthWatch" });
      }
    }

    await logHealth(prisma, {
      reportType: "exception",
      status,
      summary: `Excepción ${SEVERITY_LABEL[status]}: ${critical.map((i) => i.title).join("; ")}`.slice(0, 1000),
      detectedErrors: critical,
      actionsTaken: actions,
      recommendations: buildRecommendations(critical).join(" | "),
      dedupeKey,
      emailSent: emailStatus === "sent",
    });

    return { status, emailStatus, issues: critical.length, actions: actions.length, suppressed: alreadyAlerted };
  } catch (error) {
    logger.error("Health watch failed.", { error, route: "monitoringService.runHealthWatch" });
    return { status: "error" };
  }
}
