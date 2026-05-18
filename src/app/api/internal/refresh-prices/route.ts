import {
  authorizeCronRequest,
  cronUnauthorizedResponse,
  noStoreHeaders,
} from "@/lib/cronAuth";
import { snapshotCurrentPrices } from "@/services/priceSnapshotService";
import { compactPriceHistory } from "@/services/priceCompactionService";

export const dynamic = "force-dynamic";

async function handleRefreshPrices(request: Request) {
  const authorization = authorizeCronRequest(request);

  if (authorization.status !== 200) {
    return cronUnauthorizedResponse(authorization);
  }

  const result = await snapshotCurrentPrices();
  const compaction = await compactPriceHistory();

  const body = { ...result, compaction };

  if (result.status === "database_unavailable") {
    return Response.json(body, { headers: noStoreHeaders, status: 503 });
  }

  if (result.status === "error") {
    return Response.json(body, { headers: noStoreHeaders, status: 500 });
  }

  return Response.json(body, { headers: noStoreHeaders });
}

export async function GET(request: Request) {
  return handleRefreshPrices(request);
}

export async function POST(request: Request) {
  return handleRefreshPrices(request);
}
