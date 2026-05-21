import {
  authorizeCronRequest,
  cronUnauthorizedResponse,
  noStoreHeaders,
} from "@/lib/cronAuth";
import { backfillProductDescriptions } from "@/services/aiDescriptionService";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function parseLimit(request: Request): number {
  const value = new URL(request.url).searchParams.get("limit");
  const parsed = value ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

async function handle(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (authorization.status !== 200) {
    return cronUnauthorizedResponse(authorization);
  }

  const result = await backfillProductDescriptions(parseLimit(request));

  const httpStatus =
    result.status === "database_unavailable" ? 503 : result.status === "ai_unavailable" ? 503 : 200;

  return Response.json(result, { headers: noStoreHeaders, status: httpStatus });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
