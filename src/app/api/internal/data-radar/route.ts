import {
  authorizeCronRequest,
  cronUnauthorizedResponse,
  noStoreHeaders,
} from "@/lib/cronAuth";
import {
  acquireCronRunGuard,
  PRICE_INDEX_JOB_GUARD_NAME,
} from "@/lib/cronRunGuard";
import { logger } from "@/lib/logger";
import { isDatabaseConfigured } from "@/lib/prisma";
import {
  persistBnaDataRadarSnapshots,
  runBnaDataRadar,
} from "@/services/dataRadarService";
import {
  buildPhase3ReadinessReport,
  persistPhase3ReadinessReport,
} from "@/services/phaseReadinessService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const JOB_NAME = "data-radar";
const MIN_INTERVAL_SECONDS = 60 * 60;
const MAX_RUNS_PER_DAY = 1;

function jsonWithApproximateSize(
  body: Record<string, unknown>,
  init?: ResponseInit,
) {
  const payloadBytes = Buffer.byteLength(JSON.stringify(body), "utf8");
  return Response.json({ ...body, payloadBytes }, { ...init, headers: noStoreHeaders });
}

async function handleDataRadar(request: Request) {
  const authorization = authorizeCronRequest(request);

  if (authorization.status !== 200) {
    return cronUnauthorizedResponse(authorization);
  }

  const guard = await acquireCronRunGuard({
    enabled: process.env.PRICE_RADAR_CRON_ENABLED === "true",
    jobName: PRICE_INDEX_JOB_GUARD_NAME,
    maxRunsPerDay: MAX_RUNS_PER_DAY,
    minIntervalSeconds: MIN_INTERVAL_SECONDS,
  });

  if (!guard.allowed) {
    logger.warn("Scheduled job skipped.", {
      route: "api/internal/data-radar",
      metadata: { job: JOB_NAME, reason: guard.reason },
    });
    return jsonWithApproximateSize(
      { job: JOB_NAME, processed: 0, reason: guard.reason, skipped: 1, status: "skipped" },
      { status: guard.reason === "guard_unavailable" ? 503 : 200 },
    );
  }

  if (!isDatabaseConfigured()) {
    logger.warn("Scheduled job skipped.", {
      route: "api/internal/data-radar",
      metadata: { job: JOB_NAME, reason: "database_unavailable" },
    });
    return jsonWithApproximateSize(
      { job: JOB_NAME, processed: 0, skipped: 1, status: "database_unavailable" },
      { status: 503 },
    );
  }

  const startedAt = Date.now();
  logger.info("Scheduled job started.", {
    route: "api/internal/data-radar",
    metadata: { job: JOB_NAME, runNumber: guard.runNumber },
  });

  try {
    const result = await runBnaDataRadar();
    const persistence = await persistBnaDataRadarSnapshots(result);
    const phase3Readiness = await buildPhase3ReadinessReport(result);
    const phase3Persistence = await persistPhase3ReadinessReport(phase3Readiness);
    const durationMs = Date.now() - startedAt;
    const written = persistence.status === "stored" ? persistence.snapshots : 0;
    const httpStatus = result.status === "no_fx_data" ? 502 : 200;

    logger.info("Scheduled job completed.", {
      durationMs,
      route: "api/internal/data-radar",
      metadata: {
        job: JOB_NAME,
        processed: result.scopes.length,
        rowsRead: result.rowsRead,
        rowsWritten: written,
        status: result.status,
        truncated: result.truncated,
      },
    });

    return jsonWithApproximateSize(
      {
        durationMs,
        job: JOB_NAME,
        processed: result.scopes.length,
        readiness: phase3Readiness.status,
        readinessStored: phase3Persistence.status === "stored",
        rowsRead: result.rowsRead,
        rowsWritten: written,
        skipped: 0,
        status: result.status,
        truncated: result.truncated,
      },
      { status: httpStatus },
    );
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    logger.error("Scheduled job failed.", {
      durationMs,
      error,
      route: "api/internal/data-radar",
      metadata: { job: JOB_NAME, reason: "execution_error" },
    });
    return jsonWithApproximateSize(
      {
        durationMs,
        job: JOB_NAME,
        processed: 0,
        reason: "execution_error",
        skipped: 0,
        status: "error",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleDataRadar(request);
}

export async function POST(request: Request) {
  return handleDataRadar(request);
}
