import { getPrismaClient } from "@/lib/prisma";
import { getCircuitSnapshot } from "@/lib/circuitBreaker";

const noStoreHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "warn" | "fail";

type HealthPayload = {
  status: CheckStatus;
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    database: { status: CheckStatus; latencyMs: number | null; error?: string };
    lastRefreshCron: {
      status: CheckStatus;
      startedAt: string | null;
      finishedAt: string | null;
      ageMinutes: number | null;
      jobStatus: string | null;
    };
    mercadolibre: {
      status: CheckStatus;
      circuit: "closed" | "open" | "half-open" | "unknown";
      consecutiveFailures: number;
    };
  };
};

function worstStatus(...statuses: CheckStatus[]): CheckStatus {
  if (statuses.includes("fail")) return "fail";
  if (statuses.includes("warn")) return "warn";
  return "ok";
}

async function checkDatabase(): Promise<HealthPayload["checks"]["database"]> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return { latencyMs: null, status: "fail", error: "database_unavailable" };
  }

  const startedAt = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { latencyMs: Math.round(performance.now() - startedAt), status: "ok" };
  } catch {
    return {
      error: "database_unavailable",
      latencyMs: null,
      status: "fail",
    };
  }
}

async function checkLastRefreshCron(): Promise<HealthPayload["checks"]["lastRefreshCron"]> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return {
      ageMinutes: null,
      finishedAt: null,
      jobStatus: null,
      startedAt: null,
      status: "warn",
    };
  }

  try {
    const job = await prisma.scrapeJob.findFirst({
      where: { action: "refreshPrices" },
      orderBy: { startedAt: "desc" },
    });

    if (!job) {
      return {
        ageMinutes: null,
        finishedAt: null,
        jobStatus: null,
        startedAt: null,
        status: "warn",
      };
    }

    const ageMinutes = (Date.now() - job.startedAt.getTime()) / 60_000;
    const tooOld = ageMinutes > 60 * 36;

    return {
      ageMinutes: Math.round(ageMinutes),
      finishedAt: job.finishedAt?.toISOString() ?? null,
      jobStatus: job.status,
      startedAt: job.startedAt.toISOString(),
      status: tooOld ? "warn" : job.status === "error" ? "warn" : "ok",
    };
  } catch {
    return {
      ageMinutes: null,
      finishedAt: null,
      jobStatus: null,
      startedAt: null,
      status: "warn",
    };
  }
}

function checkMercadoLibre(): HealthPayload["checks"]["mercadolibre"] {
  const snapshot = getCircuitSnapshot("mercadolibre");
  if (!snapshot) {
    return { circuit: "unknown", consecutiveFailures: 0, status: "ok" };
  }

  return {
    circuit: snapshot.state,
    consecutiveFailures: snapshot.consecutiveFailures,
    status: snapshot.state === "open" ? "warn" : "ok",
  };
}

export async function GET() {
  const [database, lastRefreshCron] = await Promise.all([
    checkDatabase(),
    checkLastRefreshCron(),
  ]);
  const mercadolibre = checkMercadoLibre();

  const payload: HealthPayload = {
    checks: { database, lastRefreshCron, mercadolibre },
    status: worstStatus(database.status, lastRefreshCron.status, mercadolibre.status),
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: noStoreHeaders,
    status: payload.status === "fail" ? 503 : 200,
  });
}
