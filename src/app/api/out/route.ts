import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { recordOfferClick } from "@/services/clickTrackingService";
import { syncAuthUserToPrisma } from "@/services/userSyncService";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

function redirectTo(url: string) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const productSlug = request.nextUrl.searchParams.get("slug")?.trim() ?? "";
  const offerKey = request.nextUrl.searchParams.get("offer")?.trim() ?? "";

  if (!productSlug || !offerKey) {
    return Response.json(
      { reason: "missing_offer", status: "error" },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  const user = await getCurrentUser();
  const syncResult = user ? await syncAuthUserToPrisma(user) : null;
  const userId = syncResult?.status === "synced" ? user?.id : null;
  const result = await recordOfferClick({ offerKey, productSlug, userId });

  if (result.status === "not_found") {
    return Response.json(
      { reason: "offer_not_found", status: "error" },
      { headers: noStoreHeaders, status: 404 },
    );
  }

  return redirectTo(result.url);
}
