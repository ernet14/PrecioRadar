import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { recordOfferClick } from "@/services/clickTrackingService";
import { syncAuthUserToPrisma } from "@/services/userSyncService";
import { outRouteSchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/ratelimit";
import { isAllowedOutboundUrl } from "@/lib/utils/input";

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
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const { success } = await rateLimit("out", ip);

  if (!success) {
    return Response.json(
      { reason: "rate_limited", status: "error" },
      { headers: noStoreHeaders, status: 429 },
    );
  }

  const parsed = outRouteSchema.safeParse({
    slug: request.nextUrl.searchParams.get("slug"),
    offer: request.nextUrl.searchParams.get("offer"),
  });

  if (!parsed.success) {
    return Response.json(
      { reason: "missing_offer", status: "error" },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  const { slug: productSlug, offer: offerKey } = parsed.data;

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

  if (!isAllowedOutboundUrl(result.url)) {
    return Response.json(
      { reason: "unsafe_destination", status: "error" },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  return redirectTo(result.url);
}
