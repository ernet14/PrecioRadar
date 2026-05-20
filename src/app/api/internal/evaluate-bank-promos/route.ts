import {
  authorizeCronRequest,
  cronUnauthorizedResponse,
  noStoreHeaders,
} from "@/lib/cronAuth";
import { evaluateBankPromoNotifications } from "@/services/bankPromoService";

export const dynamic = "force-dynamic";

async function handleEvaluateBankPromos(request: Request) {
  const authorization = authorizeCronRequest(request);

  if (authorization.status !== 200) {
    return cronUnauthorizedResponse(authorization);
  }

  const result = await evaluateBankPromoNotifications();

  if (result.status === "evaluated") {
    return Response.json(result, { headers: noStoreHeaders });
  }

  if (result.status === "database_unavailable") {
    return Response.json(result, { headers: noStoreHeaders, status: 503 });
  }

  return Response.json(result, { headers: noStoreHeaders, status: 500 });
}

export async function GET(request: Request) {
  return handleEvaluateBankPromos(request);
}

export async function POST(request: Request) {
  return handleEvaluateBankPromos(request);
}
