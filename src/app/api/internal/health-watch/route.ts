import {
  authorizeCronRequest,
  cronUnauthorizedResponse,
  noStoreHeaders,
} from "@/lib/cronAuth";
import { runHealthWatch } from "@/services/monitoringService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (authorization.status !== 200) {
    return cronUnauthorizedResponse(authorization);
  }

  const result = await runHealthWatch();

  // health-watch nunca devuelve 5xx aunque detecte fallas: el objetivo es que
  // el propio chequeo no se marque como caído. Reporta el estado en el body.
  return Response.json(result, { headers: noStoreHeaders });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
