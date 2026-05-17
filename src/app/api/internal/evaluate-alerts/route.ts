import { timingSafeEqual } from "node:crypto";
import { evaluateAllUserAlerts } from "@/services/alertService";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

function getCronSecret() {
  return process.env.CRON_SECRET?.trim() ?? "";
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() ?? "";
}

function secretsMatch(a: string, b: string) {
  if (!a || !b) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function isAuthorized(request: Request) {
  const cronSecret = getCronSecret();

  if (!cronSecret) {
    return { reason: "missing_cron_secret", status: 503 } as const;
  }

  const headerSecret = request.headers.get("x-cron-secret")?.trim() ?? "";
  const bearerToken = getBearerToken(request);

  if (secretsMatch(bearerToken, cronSecret) || secretsMatch(headerSecret, cronSecret)) {
    return { status: 200 } as const;
  }

  return { reason: "unauthorized", status: 401 } as const;
}

async function handleEvaluateAlerts(request: Request) {
  const authorization = isAuthorized(request);

  if (authorization.status !== 200) {
    return Response.json(
      { reason: authorization.reason, status: "error" },
      { headers: noStoreHeaders, status: authorization.status },
    );
  }

  const result = await evaluateAllUserAlerts();

  if (result.status === "evaluated") {
    return Response.json(result, { headers: noStoreHeaders });
  }

  if (result.status === "database_unavailable") {
    return Response.json(result, { headers: noStoreHeaders, status: 503 });
  }

  return Response.json(result, { headers: noStoreHeaders, status: 500 });
}

export async function GET(request: Request) {
  return handleEvaluateAlerts(request);
}

export async function POST(request: Request) {
  return handleEvaluateAlerts(request);
}
