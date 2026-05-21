import { authenticateApiKey } from "@/lib/apiAuth";
import { getTierConfig } from "@/lib/apiTiers";
import { rateLimitApi } from "@/lib/ratelimit";
import { getApiProductPricing } from "@/services/apiPricingService";

export const dynamic = "force-dynamic";

const jsonHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

function error(status: number, reason: string, extra?: Record<string, unknown>) {
  return Response.json({ error: reason, ...extra }, { headers: jsonHeaders, status });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return error(auth.status, auth.reason);

  const limit = await rateLimitApi(auth.tier, auth.apiKeyId);
  if (!limit.success) {
    return error(429, "rate_limit_exceeded", { tier: auth.tier });
  }

  const { slug } = await params;
  const tier = getTierConfig(auth.tier);
  const result = await getApiProductPricing(slug, tier.historyDays);

  if (result.status === "database_unavailable") return error(503, "database_unavailable");
  if (result.status === "not_found") return error(404, "product_not_found");

  return Response.json(
    { tier: auth.tier, ...result.data },
    {
      headers: {
        ...jsonHeaders,
        ...(typeof limit.remaining === "number"
          ? { "X-RateLimit-Remaining": String(limit.remaining) }
          : {}),
      },
    },
  );
}
