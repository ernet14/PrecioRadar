import {
  authorizeCronRequest,
  cronUnauthorizedResponse,
  noStoreHeaders,
} from "@/lib/cronAuth";
import { runDailyReport } from "@/services/monitoringService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (authorization.status !== 200) {
    return cronUnauthorizedResponse(authorization);
  }

  const result = await runDailyReport();

  const httpStatus =
    result.status === "database_unavailable" ? 503 : result.status === "error" ? 500 : 200;

  return Response.json(result, { headers: noStoreHeaders, status: httpStatus });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
