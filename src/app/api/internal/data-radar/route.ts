import {
  authorizeCronRequest,
  cronUnauthorizedResponse,
  noStoreHeaders,
} from "@/lib/cronAuth";
import { isDatabaseConfigured } from "@/lib/prisma";
import { runBnaDataRadar } from "@/services/dataRadarService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handleDataRadar(request: Request) {
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

  const result = await runBnaDataRadar();
  const httpStatus = result.status === "no_fx_data" ? 502 : 200;

  return Response.json(result, { headers: noStoreHeaders, status: httpStatus });
}

export async function GET(request: Request) {
  return handleDataRadar(request);
}

export async function POST(request: Request) {
  return handleDataRadar(request);
}
