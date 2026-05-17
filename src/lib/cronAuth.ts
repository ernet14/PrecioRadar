import { timingSafeEqual } from "node:crypto";

export const noStoreHeaders = { "Cache-Control": "no-store" };

export type CronAuthorization =
  | { status: 200 }
  | { reason: "missing_cron_secret" | "unauthorized"; status: 401 | 503 };

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

export function authorizeCronRequest(request: Request): CronAuthorization {
  const cronSecret = getCronSecret();

  if (!cronSecret) {
    return { reason: "missing_cron_secret", status: 503 };
  }

  const bearerToken = getBearerToken(request);
  const headerSecret = request.headers.get("x-cron-secret")?.trim() ?? "";

  if (secretsMatch(bearerToken, cronSecret) || secretsMatch(headerSecret, cronSecret)) {
    return { status: 200 };
  }

  return { reason: "unauthorized", status: 401 };
}

export function cronUnauthorizedResponse(authorization: Exclude<CronAuthorization, { status: 200 }>) {
  return Response.json(
    { reason: authorization.reason, status: "error" },
    { headers: noStoreHeaders, status: authorization.status },
  );
}
