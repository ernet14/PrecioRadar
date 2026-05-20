import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/seo/site";
import { requireAdmin } from "@/lib/supabase/auth";
import vercelConfig from "../../../../vercel.json";
import { RefreshControls } from "./RefreshControls";

export const metadata: Metadata = {
  title: "Estado operativo",
  robots: { follow: false, index: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUCCESS_PROVIDER_STATUSES = new Set(["ok", "ready", "success"]);

type ExternalLink = {
  description: string;
  href: string;
  icon: string | null;
  label: string;
};

type ExternalLinkGroup = {
  group: string;
  links: ExternalLink[];
};

const externalLinkGroups: ExternalLinkGroup[] = [
  {
    group: "Hosting y deploy",
    links: [
      {
        description: "Dashboard de proyectos.",
        href: "https://vercel.com/dashboard",
        icon: "vercel",
        label: "Vercel · Dashboard",
      },
      {
        description: "Historial de deploys del proyecto.",
        href: "https://vercel.com/dashboard/deployments",
        icon: "vercel",
        label: "Vercel · Deployments",
      },
      {
        description: "Logs en runtime de Functions y middleware.",
        href: "https://vercel.com/dashboard/usage/logs",
        icon: "vercel",
        label: "Vercel · Logs",
      },
      {
        description: "Cron jobs configurados en el proyecto.",
        href: "https://vercel.com/dashboard/cron-jobs",
        icon: "vercel",
        label: "Vercel · Cron jobs",
      },
      {
        description: "Variables de entorno por entorno (dev/preview/prod).",
        href: "https://vercel.com/dashboard/environment-variables",
        icon: "vercel",
        label: "Vercel · Env vars",
      },
    ],
  },
  {
    group: "Base de datos y storage",
    links: [
      {
        description: "Proyectos Supabase (Postgres + Auth).",
        href: "https://supabase.com/dashboard/projects",
        icon: "supabase",
        label: "Supabase · Projects",
      },
      {
        description: "SQL editor y tabla de datos.",
        href: "https://supabase.com/dashboard/project/_/sql/new",
        icon: "supabase",
        label: "Supabase · SQL Editor",
      },
      {
        description: "Usuarios y metadata (rol ADMIN).",
        href: "https://supabase.com/dashboard/project/_/auth/users",
        icon: "supabase",
        label: "Supabase · Auth Users",
      },
      {
        description: "Rate limit y cache (REST URL / TOKEN).",
        href: "https://console.upstash.com/redis",
        icon: "upstash",
        label: "Upstash · Redis",
      },
    ],
  },
  {
    group: "DNS, dominio y red",
    links: [
      {
        description: "DNS, proxy y reglas de seguridad.",
        href: "https://dash.cloudflare.com/",
        icon: "cloudflare",
        label: "Cloudflare",
      },
      {
        description: "Sitemap publico del dominio.",
        href: "https://www.precio-radar.com/sitemap.xml",
        icon: null,
        label: "Sitemap publico",
      },
      {
        description: "robots.txt publico del dominio.",
        href: "https://www.precio-radar.com/robots.txt",
        icon: null,
        label: "robots.txt",
      },
    ],
  },
  {
    group: "SEO e indexacion",
    links: [
      {
        description: "Indexacion y rendimiento en Google.",
        href: "https://search.google.com/search-console",
        icon: "googlesearchconsole",
        label: "Google Search Console",
      },
      {
        description: "Indexacion en Bing.",
        href: "https://www.bing.com/webmasters",
        icon: "bing",
        label: "Bing Webmaster Tools",
      },
      {
        description: "Analytics web (si esta vinculado al dominio).",
        href: "https://analytics.google.com/",
        icon: "googleanalytics",
        label: "Google Analytics",
      },
      {
        description: "PageSpeed Insights del dominio.",
        href: "https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fwww.precio-radar.com",
        icon: "pagespeedinsights",
        label: "PageSpeed Insights",
      },
    ],
  },
  {
    group: "Monitoreo y errores",
    links: [
      {
        description: "Monitoreo de uptime externo.",
        href: "https://uptimerobot.com/dashboard",
        icon: "uptimerobot",
        label: "UptimeRobot",
      },
      {
        description: "Errores y trazas en runtime.",
        href: "https://sentry.io/issues/",
        icon: "sentry",
        label: "Sentry · Issues",
      },
      {
        description: "Performance y replays.",
        href: "https://sentry.io/performance/",
        icon: "sentry",
        label: "Sentry · Performance",
      },
    ],
  },
  {
    group: "Integraciones y email",
    links: [
      {
        description: "Envio transaccional de mails.",
        href: "https://resend.com/overview",
        icon: "resend",
        label: "Resend · Overview",
      },
      {
        description: "Historial de mails enviados.",
        href: "https://resend.com/emails",
        icon: "resend",
        label: "Resend · Emails",
      },
      {
        description: "App MercadoLibre (OAuth + afiliados).",
        href: "https://developers.mercadolibre.com.ar/devcenter",
        icon: "mercadolibre",
        label: "MercadoLibre · Devcenter",
      },
      {
        description: "Panel de afiliados MercadoLibre.",
        href: "https://www.mercadolibre.com.ar/afiliados",
        icon: "mercadolibre",
        label: "MercadoLibre · Afiliados",
      },
    ],
  },
];

type DatabaseStatus =
  | { configured: true; ok: true; latencyMs: number }
  | { configured: true; ok: false; latencyMs: number; error: string }
  | { configured: false; ok: false; reason: string };

type SitemapStatus = {
  url: string;
  ok: boolean;
  httpStatus: number | null;
  urlCount: number | null;
  latencyMs: number;
  error: string | null;
};

type ScrapeJobRow = {
  id: string;
  provider: string;
  action: string;
  status: string;
  processed: number;
  updated: number;
  errors: number;
  outliers: number;
  startedAt: Date;
  finishedAt: Date | null;
  durationMs: number | null;
};

type ProviderLogRow = {
  id: string;
  provider: string;
  action: string;
  status: string;
  errorMessage: string | null;
  latencyMs: number | null;
  createdAt: Date;
  storeName: string | null;
};

type AuditLogRow = {
  id: string;
  event: string;
  resource: string | null;
  resourceId: string | null;
  actorEmail: string | null;
  createdAt: Date;
};

const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  second: "2-digit",
  year: "numeric",
});

function formatDateTime(date: Date | null | undefined) {
  if (!date) {
    return "-";
  }

  return dateTimeFormatter.format(date);
}

function formatDuration(ms: number | null | undefined) {
  if (ms === null || ms === undefined) {
    return "-";
  }

  if (ms < 1000) {
    return `${ms} ms`;
  }

  return `${(ms / 1000).toFixed(1)} s`;
}

async function checkDatabase(): Promise<DatabaseStatus> {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      ok: false,
      reason: "Falta configurar DATABASE_URL o DIRECT_URL.",
    };
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    return {
      configured: false,
      ok: false,
      reason: "Cliente Prisma no disponible.",
    };
  }

  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return { configured: true, ok: true, latencyMs: Date.now() - start };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkSitemap(): Promise<SitemapStatus> {
  const url = `${getSiteUrl()}/sitemap.xml`;
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      cache: "no-store",
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = response.ok ? await response.text() : "";
    const urlMatches = response.ok ? text.match(/<url>/g) : null;

    return {
      error: null,
      httpStatus: response.status,
      latencyMs: Date.now() - start,
      ok: response.ok,
      url,
      urlCount: urlMatches ? urlMatches.length : null,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      httpStatus: null,
      latencyMs: Date.now() - start,
      ok: false,
      url,
      urlCount: null,
    };
  }
}

async function loadScrapeJobs(): Promise<ScrapeJobRow[] | null> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  try {
    const rows = await prisma.scrapeJob.findMany({
      orderBy: { startedAt: "desc" },
      select: {
        action: true,
        durationMs: true,
        errors: true,
        finishedAt: true,
        id: true,
        outliers: true,
        processed: true,
        provider: true,
        startedAt: true,
        status: true,
        updated: true,
      },
      take: 10,
    });

    return rows;
  } catch {
    return null;
  }
}

async function loadProviderLogs(): Promise<ProviderLogRow[] | null> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  try {
    const rows = await prisma.providerLog.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        action: true,
        createdAt: true,
        errorMessage: true,
        id: true,
        latencyMs: true,
        provider: true,
        status: true,
        store: { select: { name: true } },
      },
      take: 15,
      where: {
        OR: [
          { status: { notIn: Array.from(SUCCESS_PROVIDER_STATUSES) } },
          { action: "cron.outlierDetected" },
        ],
      },
    });

    return rows.map((row) => ({
      action: row.action,
      createdAt: row.createdAt,
      errorMessage: row.errorMessage,
      id: row.id,
      latencyMs: row.latencyMs,
      provider: row.provider,
      status: row.status,
      storeName: row.store?.name ?? null,
    }));
  } catch {
    return null;
  }
}

type ActivityDay = {
  date: string;
  label: string;
  searches: number;
  clicks: number;
};

const ACTIVITY_RANGES = {
  "1d": 1,
  "7d": 7,
  "14d": 14,
  "30d": 30,
} as const;

type ActivityRangeKey = keyof typeof ACTIVITY_RANGES;

const ACTIVITY_RANGE_ORDER: ActivityRangeKey[] = ["1d", "7d", "14d", "30d"];

function isActivityRange(value: string): value is ActivityRangeKey {
  return value in ACTIVITY_RANGES;
}

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDayLabel(date: Date) {
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
}

async function loadActivity(
  range: ActivityRangeKey,
): Promise<ActivityDay[] | null> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  const days = ACTIVITY_RANGES[range];
  const today = new Date();
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  start.setUTCDate(start.getUTCDate() - (days - 1));

  try {
    const [searches, clicks] = await Promise.all([
      prisma.searchLog.findMany({
        select: { createdAt: true },
        where: { createdAt: { gte: start } },
      }),
      prisma.clickTracking.findMany({
        select: { clickedAt: true },
        where: { clickedAt: { gte: start } },
      }),
    ]);

    const result: ActivityDay[] = [];

    for (let index = 0; index < days; index += 1) {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + index);
      result.push({
        clicks: 0,
        date: toDayKey(day),
        label: buildDayLabel(day),
        searches: 0,
      });
    }

    const indexByDate = new Map(result.map((day, index) => [day.date, index]));

    for (const row of searches) {
      const key = toDayKey(row.createdAt);
      const idx = indexByDate.get(key);
      if (idx !== undefined) {
        result[idx].searches += 1;
      }
    }

    for (const row of clicks) {
      const key = toDayKey(row.clickedAt);
      const idx = indexByDate.get(key);
      if (idx !== undefined) {
        result[idx].clicks += 1;
      }
    }

    return result;
  } catch {
    return null;
  }
}

type AffiliateProgramClicks = { program: string; clicks: number };

async function loadAffiliateBreakdown(): Promise<AffiliateProgramClicks[] | null> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  try {
    const groups = await prisma.clickTracking.groupBy({
      by: ["program"],
      where: { isAffiliate: true },
      _count: { _all: true },
    });

    return groups
      .map((group) => ({
        program: group.program ?? "sin-programa",
        clicks: group._count._all,
      }))
      .sort((left, right) => right.clicks - left.clicks);
  } catch {
    return null;
  }
}

function computeAgeHours(date: Date | null) {
  if (!date) {
    return null;
  }
  return (new Date().getTime() - date.getTime()) / (60 * 60 * 1000);
}

async function countRecentErrors(): Promise<number | null> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    return await prisma.providerLog.count({
      where: {
        createdAt: { gte: since },
        status: { notIn: Array.from(SUCCESS_PROVIDER_STATUSES) },
      },
    });
  } catch {
    return null;
  }
}

async function getLastSuccessfulJob(): Promise<Date | null> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  try {
    const row = await prisma.scrapeJob.findFirst({
      orderBy: { finishedAt: "desc" },
      select: { finishedAt: true },
      where: { finishedAt: { not: null }, status: "completed" },
    });

    return row?.finishedAt ?? null;
  } catch {
    return null;
  }
}

async function loadAuditLogs(): Promise<AuditLogRow[] | null> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  try {
    const rows = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        actorEmail: true,
        createdAt: true,
        event: true,
        id: true,
        resource: true,
        resourceId: true,
      },
      take: 10,
    });

    return rows;
  } catch {
    return null;
  }
}

function statusBadgeVariant(status: string): "brand" | "neutral" | "success" {
  const normalized = status.toLowerCase();

  if (SUCCESS_PROVIDER_STATUSES.has(normalized) || normalized === "completed") {
    return "success";
  }

  if (normalized === "running") {
    return "brand";
  }

  return "neutral";
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2.5 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`}
    />
  );
}

function SectionCard({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <Card className="border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

type HealthLevel = "ok" | "warn" | "error" | "unknown";

function levelColor(level: HealthLevel) {
  switch (level) {
    case "ok":
      return "bg-emerald-500";
    case "warn":
      return "bg-amber-500";
    case "error":
      return "bg-rose-500";
    default:
      return "bg-slate-300";
  }
}

function levelBadgeClasses(level: HealthLevel) {
  switch (level) {
    case "ok":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "warn":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "error":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function HealthChip({
  detail,
  label,
  level,
}: {
  detail: string;
  label: string;
  level: HealthLevel;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 ${levelBadgeClasses(level)}`}
    >
      <span
        aria-hidden
        className={`inline-block size-2.5 shrink-0 rounded-full ${levelColor(level)}`}
      />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
        <p className="mt-0.5 truncate font-mono text-xs">{detail}</p>
      </div>
    </div>
  );
}

function Sparkline({
  color = "#3b82f6",
  values,
}: {
  color?: string;
  values: number[];
}) {
  if (values.length === 0) {
    return null;
  }

  const width = 120;
  const height = 32;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden
      className="block"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <polyline
        fill="none"
        points={points}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function KpiTile({
  color,
  delta,
  label,
  values,
  total,
}: {
  color: string;
  delta: number | null;
  label: string;
  values: number[];
  total: number;
}) {
  const deltaPositive = delta !== null && delta > 0;
  const deltaNegative = delta !== null && delta < 0;
  const deltaText =
    delta === null
      ? "—"
      : `${deltaPositive ? "+" : ""}${delta.toFixed(0)}% vs anterior`;
  const deltaClass = deltaPositive
    ? "text-emerald-700"
    : deltaNegative
      ? "text-rose-700"
      : "text-slate-500";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="font-mono text-2xl font-bold text-slate-950">{total}</p>
        <Sparkline color={color} values={values} />
      </div>
      <p className={`mt-2 font-mono text-xs ${deltaClass}`}>{deltaText}</p>
    </div>
  );
}

function computeDelta(values: number[]) {
  if (values.length < 2) {
    return null;
  }

  const half = Math.floor(values.length / 2);
  const prev = values.slice(0, half).reduce((sum, value) => sum + value, 0);
  const curr = values.slice(half).reduce((sum, value) => sum + value, 0);

  if (prev === 0) {
    return curr === 0 ? 0 : 100;
  }

  return ((curr - prev) / prev) * 100;
}

function LinkIcon({ icon, label }: { icon: string | null; label: string }) {
  if (icon) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        aria-hidden
        className="size-8 shrink-0 rounded-md bg-white object-contain p-1 ring-1 ring-slate-200"
        height={32}
        loading="lazy"
        src={`https://cdn.simpleicons.org/${icon}`}
        width={32}
      />
    );
  }

  const initial = label.replace(/[^a-z0-9]/gi, "").charAt(0).toUpperCase() || "·";

  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-bold text-slate-600 ring-1 ring-slate-200"
    >
      {initial}
    </span>
  );
}

function MonoTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 font-mono text-xs">
        {children}
      </table>
    </div>
  );
}

function ActivityChart({ days }: { days: ActivityDay[] }) {
  const maxValue = Math.max(
    1,
    ...days.map((day) => Math.max(day.searches, day.clicks)),
  );
  const chartHeight = 140;
  const barAreaWidth = 32;
  const groupGap = 8;
  const chartWidth = days.length * (barAreaWidth + groupGap);
  const totalSearches = days.reduce((sum, day) => sum + day.searches, 0);
  const totalClicks = days.reduce((sum, day) => sum + day.clicks, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-3 rounded-sm bg-blue-500" />
          Busquedas <span className="font-mono text-slate-900">{totalSearches}</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-3 rounded-sm bg-emerald-500" />
          Clicks <span className="font-mono text-slate-900">{totalClicks}</span>
        </span>
        <span className="text-slate-400">Max diario: {maxValue}</span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <svg
          aria-label="Actividad de los ultimos 14 dias"
          height={chartHeight + 32}
          role="img"
          viewBox={`0 0 ${chartWidth} ${chartHeight + 32}`}
          width={chartWidth}
        >
          {days.map((day, index) => {
            const x = index * (barAreaWidth + groupGap);
            const barWidth = (barAreaWidth - 4) / 2;
            const searchHeight = (day.searches / maxValue) * chartHeight;
            const clickHeight = (day.clicks / maxValue) * chartHeight;

            return (
              <g key={day.date}>
                <rect
                  fill="#3b82f6"
                  height={searchHeight}
                  rx={2}
                  width={barWidth}
                  x={x}
                  y={chartHeight - searchHeight}
                >
                  <title>{`${day.label} · busquedas: ${day.searches}`}</title>
                </rect>
                <rect
                  fill="#10b981"
                  height={clickHeight}
                  rx={2}
                  width={barWidth}
                  x={x + barWidth + 2}
                  y={chartHeight - clickHeight}
                >
                  <title>{`${day.label} · clicks: ${day.clicks}`}</title>
                </rect>
                <text
                  fill="#64748b"
                  fontFamily="ui-monospace, monospace"
                  fontSize="10"
                  textAnchor="middle"
                  x={x + barAreaWidth / 2 - 1}
                  y={chartHeight + 14}
                >
                  {day.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

type AdminStatusSearchParams = {
  range?: string;
  ui?: string;
};

export default async function AdminStatusPage({
  searchParams,
}: {
  searchParams: Promise<AdminStatusSearchParams>;
}) {
  await requireAdmin();
  const resolvedParams = await searchParams;
  const range: ActivityRangeKey =
    resolvedParams.range && isActivityRange(resolvedParams.range)
      ? resolvedParams.range
      : "14d";
  const isConsoleMode = resolvedParams.ui === "console";

  const [
    database,
    sitemap,
    scrapeJobs,
    providerLogs,
    auditLogs,
    activity,
    recentErrors,
    lastSuccessfulJob,
    affiliateBreakdown,
  ] = await Promise.all([
    checkDatabase(),
    checkSitemap(),
    loadScrapeJobs(),
    loadProviderLogs(),
    loadAuditLogs(),
    loadActivity(range),
    countRecentErrors(),
    getLastSuccessfulJob(),
    loadAffiliateBreakdown(),
  ]);

  const cronJobs = (vercelConfig.crons ?? []) as Array<{
    path: string;
    schedule: string;
  }>;

  const databaseLevel: HealthLevel = database.ok ? "ok" : "error";
  const sitemapLevel: HealthLevel = sitemap.ok ? "ok" : "error";
  const errorsLevel: HealthLevel =
    recentErrors === null
      ? "unknown"
      : recentErrors === 0
        ? "ok"
        : recentErrors < 5
          ? "warn"
          : "error";

  const cronAgeHours = computeAgeHours(lastSuccessfulJob);
  const cronLevel: HealthLevel =
    cronJobs.length === 0
      ? "warn"
      : cronAgeHours === null
        ? "unknown"
        : cronAgeHours < 26
          ? "ok"
          : cronAgeHours < 48
            ? "warn"
            : "error";

  const searchValues = (activity ?? []).map((day) => day.searches);
  const clickValues = (activity ?? []).map((day) => day.clicks);
  const totalSearches = searchValues.reduce((sum, value) => sum + value, 0);
  const totalClicks = clickValues.reduce((sum, value) => sum + value, 0);

  const deploy = {
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    url: process.env.VERCEL_URL ?? null,
  };
  const shortSha = deploy.sha ? deploy.sha.slice(0, 7) : null;

  const generatedAtIso = new Date().toISOString();

  const themeClasses = isConsoleMode
    ? "bg-slate-950 text-slate-100"
    : "bg-[#f4f7fb] text-slate-950";

  return (
    <main className={`py-10 ${themeClasses}`}>
      <Container className="space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <Badge className="self-start">Admin · Operacion</Badge>
            <h1
              className={`text-2xl font-bold tracking-tight md:text-3xl ${isConsoleMode ? "font-mono" : ""}`}
            >
              Estado operativo
            </h1>
            <p
              className={`text-sm leading-6 ${isConsoleMode ? "text-slate-400" : "text-slate-600"}`}
            >
              Tablero tecnico con conexion a base, ultimos jobs, logs de
              providers y links rapidos a servicios externos.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-3 md:items-end">
            <RefreshControls generatedAtIso={generatedAtIso} />
            <Link
              className={`self-start rounded-md px-2 py-1 text-xs font-semibold underline-offset-2 hover:underline md:self-end ${isConsoleMode ? "text-slate-300" : "text-slate-600"}`}
              href={
                isConsoleMode
                  ? `/admin/status?range=${range}`
                  : `/admin/status?range=${range}&ui=console`
              }
            >
              {isConsoleMode ? "Modo claro" : "Modo console"}
            </Link>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <HealthChip
            detail={
              database.ok && "latencyMs" in database
                ? `${database.latencyMs} ms`
                : !database.configured
                  ? "no configurada"
                  : "sin respuesta"
            }
            label="Base de datos"
            level={databaseLevel}
          />
          <HealthChip
            detail={
              sitemap.ok && sitemap.urlCount !== null
                ? `${sitemap.urlCount} URLs · ${sitemap.httpStatus ?? "-"}`
                : `error ${sitemap.httpStatus ?? "?"}`
            }
            label="Sitemap"
            level={sitemapLevel}
          />
          <HealthChip
            detail={
              recentErrors === null
                ? "sin datos"
                : `${recentErrors} en 24h`
            }
            label="Errores providers"
            level={errorsLevel}
          />
          <HealthChip
            detail={
              cronJobs.length === 0
                ? "ninguno configurado"
                : lastSuccessfulJob
                  ? `ultimo ok ${formatDateTime(lastSuccessfulJob)}`
                  : "sin jobs completados"
            }
            label={`Crons (${cronJobs.length})`}
            level={cronLevel}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <SectionCard
            description="Ping SELECT 1 contra Postgres via Prisma."
            title="Base de datos"
          >
            <div className="flex items-center gap-3">
              <StatusDot ok={database.ok} />
              <span className="text-sm font-semibold text-slate-950">
                {database.ok ? "Conectada" : "Sin conexion"}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
              <div>
                <dt className="font-semibold text-slate-500">Configurada</dt>
                <dd className="mt-1 font-mono text-slate-900">
                  {database.configured ? "si" : "no"}
                </dd>
              </div>
              {"latencyMs" in database ? (
                <div>
                  <dt className="font-semibold text-slate-500">Latencia</dt>
                  <dd className="mt-1 font-mono text-slate-900">
                    {database.latencyMs} ms
                  </dd>
                </div>
              ) : null}
            </dl>
            {!database.ok ? (
              <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-900">
                {"error" in database ? database.error : database.reason}
              </p>
            ) : null}
          </SectionCard>

          <SectionCard
            description="Verificacion HTTP de /sitemap.xml en el dominio configurado."
            title="Sitemap"
          >
            <div className="flex items-center gap-3">
              <StatusDot ok={sitemap.ok} />
              <span className="text-sm font-semibold text-slate-950">
                {sitemap.ok ? "Accesible" : "No accesible"}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="col-span-2 min-w-0">
                <dt className="font-semibold text-slate-500">URL</dt>
                <dd className="mt-1 break-all font-mono text-slate-900">
                  {sitemap.url}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">HTTP</dt>
                <dd className="mt-1 font-mono text-slate-900">
                  {sitemap.httpStatus ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Latencia</dt>
                <dd className="mt-1 font-mono text-slate-900">
                  {sitemap.latencyMs} ms
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">URLs</dt>
                <dd className="mt-1 font-mono text-slate-900">
                  {sitemap.urlCount ?? "-"}
                </dd>
              </div>
            </dl>
            {sitemap.error ? (
              <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-900">
                {sitemap.error}
              </p>
            ) : null}
          </SectionCard>
        </section>

        <SectionCard
          description="Ultimos 10 jobs registrados en ScrapeJob."
          title="ScrapeJob recientes"
        >
          {scrapeJobs === null ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              No pudimos leer ScrapeJob (base no disponible o error).
            </p>
          ) : scrapeJobs.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              Todavia no se registraron jobs.
            </p>
          ) : (
            <MonoTable>
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Provider · Action</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2 text-right">Proc.</th>
                  <th className="px-2 py-2 text-right">Upd.</th>
                  <th className="px-2 py-2 text-right">Err.</th>
                  <th className="px-2 py-2 text-right">Out.</th>
                  <th className="px-2 py-2 text-right">Duracion</th>
                  <th className="px-2 py-2">Inicio</th>
                  <th className="px-2 py-2">Fin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scrapeJobs.map((job) => (
                  <tr key={job.id} className="text-slate-800">
                    <td className="px-2 py-2">
                      <span className="font-semibold text-slate-950">
                        {job.provider}
                      </span>
                      <span className="text-slate-500"> · {job.action}</span>
                    </td>
                    <td className="px-2 py-2">
                      <Badge variant={statusBadgeVariant(job.status)}>
                        {job.status}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 text-right">{job.processed}</td>
                    <td className="px-2 py-2 text-right">{job.updated}</td>
                    <td
                      className={`px-2 py-2 text-right ${job.errors > 0 ? "text-rose-700" : ""}`}
                    >
                      {job.errors}
                    </td>
                    <td
                      className={`px-2 py-2 text-right ${job.outliers > 0 ? "text-amber-700" : ""}`}
                    >
                      {job.outliers}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {formatDuration(job.durationMs)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {formatDateTime(job.startedAt)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {formatDateTime(job.finishedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </MonoTable>
          )}
        </SectionCard>

        <SectionCard
          description="Ultimos errores y eventos cron.outlierDetected en ProviderLog."
          title="ProviderLog relevantes"
        >
          {providerLogs === null ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              No pudimos leer ProviderLog (base no disponible o error).
            </p>
          ) : providerLogs.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              Sin errores ni outliers recientes.
            </p>
          ) : (
            <MonoTable>
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Fecha</th>
                  <th className="px-2 py-2">Provider · Action</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Tienda</th>
                  <th className="px-2 py-2 text-right">Latencia</th>
                  <th className="px-2 py-2">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {providerLogs.map((log) => (
                  <tr key={log.id} className="align-top text-slate-800">
                    <td className="px-2 py-2 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-2 py-2">
                      <span className="font-semibold text-slate-950">
                        {log.provider}
                      </span>
                      <span className="text-slate-500"> · {log.action}</span>
                    </td>
                    <td className="px-2 py-2">
                      <Badge variant={statusBadgeVariant(log.status)}>
                        {log.status}
                      </Badge>
                    </td>
                    <td className="px-2 py-2">{log.storeName ?? "-"}</td>
                    <td className="px-2 py-2 text-right">
                      {formatDuration(log.latencyMs)}
                    </td>
                    <td className="px-2 py-2 max-w-md break-words text-rose-700">
                      {log.errorMessage ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </MonoTable>
          )}
        </SectionCard>

        <SectionCard
          description="Ultimos 10 eventos administrativos en AuditLog."
          title="AuditLog recientes"
        >
          {auditLogs === null ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              No pudimos leer AuditLog (base no disponible o error).
            </p>
          ) : auditLogs.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              Sin eventos auditados.
            </p>
          ) : (
            <MonoTable>
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Fecha</th>
                  <th className="px-2 py-2">Evento</th>
                  <th className="px-2 py-2">Recurso</th>
                  <th className="px-2 py-2">Resource ID</th>
                  <th className="px-2 py-2">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="text-slate-800">
                    <td className="px-2 py-2 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-2 py-2 font-semibold text-slate-950">
                      {log.event}
                    </td>
                    <td className="px-2 py-2">{log.resource ?? "-"}</td>
                    <td className="px-2 py-2 max-w-[16ch] truncate" title={log.resourceId ?? ""}>
                      {log.resourceId ?? "-"}
                    </td>
                    <td className="px-2 py-2">{log.actorEmail ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </MonoTable>
          )}
        </SectionCard>

        <SectionCard
          description={`Busquedas (SearchLog) y clicks (ClickTracking) por dia. Proxy de visitas mientras no haya tracker de page views. Rango: ${range}.`}
          title="Actividad reciente"
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {ACTIVITY_RANGE_ORDER.map((option) => {
              const active = option === range;
              const href = isConsoleMode
                ? `/admin/status?range=${option}&ui=console`
                : `/admin/status?range=${option}`;

              return (
                <Link
                  className={`rounded-md border px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                  href={href}
                  key={option}
                >
                  {option}
                </Link>
              );
            })}
          </div>

          {activity === null ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              No pudimos leer la actividad (base no disponible o error).
            </p>
          ) : (
            <>
              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <KpiTile
                  color="#3b82f6"
                  delta={computeDelta(searchValues)}
                  label="Busquedas"
                  total={totalSearches}
                  values={searchValues}
                />
                <KpiTile
                  color="#10b981"
                  delta={computeDelta(clickValues)}
                  label="Clicks"
                  total={totalClicks}
                  values={clickValues}
                />
              </div>
              {activity.every(
                (day) => day.searches === 0 && day.clicks === 0,
              ) ? (
                <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                  Todavia no hay busquedas ni clicks registrados en el rango.
                </p>
              ) : (
                <ActivityChart days={activity} />
              )}
            </>
          )}
        </SectionCard>

        <SectionCard
          description="Clicks salientes atribuidos a cada programa de afiliados."
          title="Clicks de afiliado por programa"
        >
          {affiliateBreakdown === null ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              No pudimos leer la atribución (base no disponible o error).
            </p>
          ) : affiliateBreakdown.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              Todavía no hay clicks de afiliado registrados.
            </p>
          ) : (
            <ul className="space-y-2">
              {affiliateBreakdown.map((row) => {
                const max = affiliateBreakdown[0].clicks || 1;
                return (
                  <li key={row.program}>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>{row.program}</span>
                      <span>{row.clicks}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
                        style={{ width: `${Math.round((row.clicks / max) * 100)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          description="Cron jobs configurados en vercel.json. Se ejecutan via Vercel Cron en horario UTC."
          title="Cron jobs"
        >
          {cronJobs.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              No hay cron jobs configurados.
            </p>
          ) : (
            <MonoTable>
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Path</th>
                  <th className="px-2 py-2">Schedule (UTC)</th>
                  <th className="px-2 py-2">Consola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cronJobs.map((cron) => (
                  <tr key={cron.path} className="text-slate-800">
                    <td className="px-2 py-2 font-semibold text-slate-950">
                      {cron.path}
                    </td>
                    <td className="px-2 py-2">{cron.schedule}</td>
                    <td className="px-2 py-2">
                      <a
                        className="text-blue-700 underline-offset-2 hover:underline"
                        href="https://vercel.com/dashboard/cron-jobs"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Ver en Vercel
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </MonoTable>
          )}
        </SectionCard>

        <SectionCard
          description="Atajos a las consolas externas agrupados por area. Solo links, no se exponen secretos."
          title="Links rapidos"
        >
          <div className="space-y-5">
            {externalLinkGroups.map((group) => (
              <div key={group.group}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {group.group}
                </p>
                <ul className="mt-2 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <a
                        className="flex h-full items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-blue-300 hover:bg-blue-50"
                        href={link.href}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <LinkIcon icon={link.icon} label={link.label} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-950">
                            {link.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {link.description}
                          </p>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>

        <footer
          className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-xs ${
            isConsoleMode
              ? "border-slate-800 bg-slate-900 text-slate-400"
              : "border-slate-200 bg-white text-slate-500"
          }`}
        >
          <div className="flex flex-wrap items-center gap-3 font-mono">
            <span>
              env:{" "}
              <span
                className={isConsoleMode ? "text-slate-200" : "text-slate-800"}
              >
                {deploy.env ?? "unknown"}
              </span>
            </span>
            <span aria-hidden>·</span>
            <span>
              branch:{" "}
              <span
                className={isConsoleMode ? "text-slate-200" : "text-slate-800"}
              >
                {deploy.branch ?? "local"}
              </span>
            </span>
            <span aria-hidden>·</span>
            <span>
              commit:{" "}
              {shortSha ? (
                <a
                  className="underline-offset-2 hover:underline"
                  href={
                    deploy.url
                      ? `https://${deploy.url}`
                      : "https://vercel.com/dashboard/deployments"
                  }
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {shortSha}
                </a>
              ) : (
                <span
                  className={isConsoleMode ? "text-slate-200" : "text-slate-800"}
                >
                  dev
                </span>
              )}
            </span>
          </div>
          <p>
            Solo lectura. No se exponen secretos ni variables sensibles.
          </p>
        </footer>
      </Container>
    </main>
  );
}
