import {
  authorizeCronRequest,
  cronUnauthorizedResponse,
  noStoreHeaders,
} from "@/lib/cronAuth";
import {
  deactivateExpiredBankPromos,
  evaluateBankPromoNotifications,
} from "@/services/bankPromoService";
import { importBankPromosFromConfiguredSources } from "@/services/bankPromoBotService";

export const dynamic = "force-dynamic";

async function handleEvaluateBankPromos(request: Request) {
  const authorization = authorizeCronRequest(request);

  if (authorization.status !== 200) {
    return cronUnauthorizedResponse(authorization);
  }

  // Bot de integración: lee fuentes configuradas, importa/actualiza promos y
  // luego corre el mantenimiento + notificaciones.
  const importResult = await importBankPromosFromConfiguredSources();

  if (importResult.status === "database_unavailable") {
    return Response.json(importResult, { headers: noStoreHeaders, status: 503 });
  }

  if (importResult.status === "error") {
    return Response.json(importResult, { headers: noStoreHeaders, status: 500 });
  }

  const deactivated = await deactivateExpiredBankPromos();
  const result = await evaluateBankPromoNotifications();

  if (result.status === "evaluated") {
    return Response.json(
      { ...result, deactivated, importResult },
      { headers: noStoreHeaders },
    );
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
