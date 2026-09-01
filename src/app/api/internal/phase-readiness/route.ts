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
  buildPhase3ReadinessReport,
  persistPhase3ReadinessReport,
} from "@/services/phaseReadinessService";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const JOB_NAME = "phase-readiness";

function smallResponse(body: Record<string, unknown>, status = 200) {
  const payloadBytes = Buffer.byteLength(JSON.stringify(body), "utf8");
  return Response.json(
    { ...body, payloadBytes },
    { headers: noStoreHeaders, status },
  );
}

async function handlePhaseReadiness(request: Request) {
  const authorization = authorizeCronRequest(request);

  if (authorization.status !== 200) {
    return cronUnauthorizedResponse(authorization);
  }

  const guard = await acquireCronRunGuard({
    enabled: process.env.PRICE_RADAR_CRON_ENABLED === "true",
    jobName: PRICE_INDEX_JOB_GUARD_NAME,
    maxRunsPerDay: 1,
    minIntervalSeconds: 60 * 60,
  });
  if (!guard.allowed) {
    logger.warn("Scheduled job skipped.", {
      route: "api/internal/phase-readiness",
      metadata: { job: JOB_NAME, reason: guard.reason },
    });
    return smallResponse(
      { job: JOB_NAME, processed: 0, reason: guard.reason, skipped: 1, status: "skipped" },
      guard.reason === "guard_unavailable" ? 503 : 200,
    );
  }

  if (!isDatabaseConfigured()) {
    logger.warn("Scheduled job skipped.", {
      route: "api/internal/phase-readiness",
      metadata: { job: JOB_NAME, reason: "database_unavailable" },
    });
    return smallResponse(
      { job: JOB_NAME, processed: 0, skipped: 1, status: "database_unavailable" },
      503,
    );
  }

  const startedAt = Date.now();
  logger.info("Scheduled job started.", {
    route: "api/internal/phase-readiness",
    metadata: { job: JOB_NAME, runNumber: guard.runNumber },
  });

  try {
    const report = await buildPhase3ReadinessReport();
    const persistence = await persistPhase3ReadinessReport(report);
    const durationMs = Date.now() - startedAt;
    const rowsWritten = persistence.status === "stored" ? 1 : 0;

    logger.info("Scheduled job completed.", {
      durationMs,
      route: "api/internal/phase-readiness",
      metadata: {
        job: JOB_NAME,
        processed: report.scopes.length,
        rowsRead: report.rowsRead,
        rowsWritten,
        status: report.status,
        truncated: report.truncated,
      },
    });

    return smallResponse({
      durationMs,
      job: JOB_NAME,
      processed: report.scopes.length,
      rowsRead: report.rowsRead,
      skipped: 0,
      status: report.status,
      truncated: report.truncated,
      written: rowsWritten,
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    logger.error("Scheduled job failed.", {
      durationMs,
      error,
      route: "api/internal/phase-readiness",
      metadata: { job: JOB_NAME, reason: "execution_error" },
    });
    return smallResponse(
      {
        durationMs,
        job: JOB_NAME,
        processed: 0,
        reason: "execution_error",
        skipped: 0,
        status: "error",
      },
      500,
    );
  }
}

export async function GET(request: Request) {
  return handlePhaseReadiness(request);
}

export async function POST(request: Request) {
  return handlePhaseReadiness(request);
}
