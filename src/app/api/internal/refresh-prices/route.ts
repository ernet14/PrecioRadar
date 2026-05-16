import { snapshotCurrentPrices } from "@/services/priceSnapshotService";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

function getCronSecret() {
  return process.env.CRON_SECRET?.trim() ?? "";
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() ?? "";
}

function isAuthorized(request: Request) {
  const cronSecret = getCronSecret();

  if (!cronSecret) {
    return { reason: "missing_cron_secret", status: 503 } as const;
  }

  const headerSecret = request.headers.get("x-cron-secret")?.trim() ?? "";
  const bearerToken = getBearerToken(request);

  if (bearerToken === cronSecret || headerSecret === cronSecret) {
    return { status: 200 } as const;
  }

  return { reason: "unauthorized", status: 401 } as const;
}

async function handleRefreshPrices(request: Request) {
  const authorization = isAuthorized(request);

  if (authorization.status !== 200) {
    return Response.json(
      { reason: authorization.reason, status: "error" },
      { headers: noStoreHeaders, status: authorization.status },
    );
  }

  const result = await snapshotCurrentPrices();

  if (result.status === "database_unavailable") {
    return Response.json(result, { headers: noStoreHeaders, status: 503 });
  }

  return Response.json(result, { headers: noStoreHeaders });
}

export async function GET(request: Request) {
  return handleRefreshPrices(request);
}

export async function POST(request: Request) {
  return handleRefreshPrices(request);
}
