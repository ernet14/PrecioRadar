import {
  authorizeCronRequest,
  cronUnauthorizedResponse,
  noStoreHeaders,
} from "@/lib/cronAuth";
import { isDatabaseConfigured } from "@/lib/prisma";
import {
  buildPhase3ReadinessReport,
  persistPhase3ReadinessReport,
} from "@/services/phaseReadinessService";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function handlePhaseReadiness(request: Request) {
  const authorization = authorizeCronRequest(request);

  if (authorization.status !== 200) {
    return cronUnauthorizedResponse(authorization);
  }

  if (!isDatabaseConfigured()) {
    return Response.json(
      { status: "database_unavailable" },
      { headers: noStoreHeaders, status: 503 },
    );
  }

  const report = await buildPhase3ReadinessReport();
  const persistence = await persistPhase3ReadinessReport(report);

  return Response.json(
    { persistence, report, status: "ok" },
    { headers: noStoreHeaders },
  );
}

export async function GET(request: Request) {
  return handlePhaseReadiness(request);
}

export async function POST(request: Request) {
  return handlePhaseReadiness(request);
}
