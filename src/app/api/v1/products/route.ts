import { authenticateApiKey } from "@/lib/apiAuth";
import { rateLimitApi } from "@/lib/ratelimit";
import { searchApiProducts } from "@/services/apiPricingService";

export const dynamic = "force-dynamic";

const jsonHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

function error(status: number, reason: string, extra?: Record<string, unknown>) {
  return Response.json({ error: reason, ...extra }, { headers: jsonHeaders, status });
}

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return error(auth.status, auth.reason);

  const limit = await rateLimitApi(auth.tier, auth.apiKeyId);
  if (!limit.success) {
    return error(429, "rate_limit_exceeded", { tier: auth.tier });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const safeLimit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 20;
  const result = await searchApiProducts(query, safeLimit);

  if (result.status === "database_unavailable") return error(503, "database_unavailable");

  return Response.json(
    { tier: auth.tier, ...result },
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
